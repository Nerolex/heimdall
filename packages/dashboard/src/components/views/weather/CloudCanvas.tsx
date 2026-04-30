import React, { useRef, useEffect } from 'react';
import type { SunPhase } from './types';

interface Props {
  sunPhase: SunPhase;
  opacity?: number;
  /** Cloud density: 0.0 = sparse, 1.0 = full cover. Default 0.5 */
  density?: number;
  /** Lightning flash: 0 = normal, 1 = bright flash. Default 0 */
  flash?: number;
}

const VERTEX_SHADER = `#version 300 es
in vec4 position;
void main() { gl_Position = position; }
`;

/**
 * Fragment shader: 3D simplex noise FBM producing animated procedural clouds.
 * The sky color uniform adapts to sun phase (day=blue, golden=warm, night=dark).
 */
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 uSkyColor;
uniform float uDensity;
uniform float uFlash;
out vec4 fragColor;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise3(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v,C.yyy));
  vec3 x0 = v - i + dot(i,C.xxx);
  vec3 g = step(x0.yzx,x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i,289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0,i1.z,i2.z,1.0))
    + i.y + vec4(0.0,i1.y,i2.y,1.0))
    + i.x + vec4(0.0,i1.x,i2.x,1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy,y.xy);
  vec4 b1 = vec4(x.zw,y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h,vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = inversesqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float fbm3(vec2 uv, float t){
  float total = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for(int i=0;i<6;i++){
    vec3 p = vec3(uv*frequency, t*0.1);
    total += snoise3(p) * amplitude;
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return total*0.5 + 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = uv*2.0 - 1.0;
  uv.x *= iResolution.x / iResolution.y;
  uv += vec2(iTime*0.008, 0.0);
  float n = fbm3(uv*1.5, iTime*0.1);
  // uDensity controls cloud threshold: lower = denser clouds
  float low = mix(0.4, 0.15, uDensity);
  float high = mix(0.75, 0.55, uDensity);
  float cloud = smoothstep(low, high, n);
  // Tint clouds based on sun phase — mix white with sky color for warm/cool tones
  vec3 cloudColor = mix(vec3(1.0), uSkyColor, 0.3);
  // Lightning flash: brighten clouds toward white
  cloudColor = mix(cloudColor, vec3(1.0), uFlash * 0.35);
  float flashAlpha = cloud + uFlash * 0.15 * cloud;
  fragColor = vec4(cloudColor, clamp(flashAlpha, 0.0, 1.0));
}
`;

/** Sky base colors per sun phase (passed as uniform to shader) */
const SKY_COLORS: Record<SunPhase, [number, number, number]> = {
  day: [0.5608, 0.7098, 0.8627],     // soft blue
  golden: [0.85, 0.55, 0.35],         // warm orange
  night: [0.08, 0.1, 0.18],           // deep navy
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Full-screen animated procedural cloud layer using WebGL2 simplex noise FBM.
 * Adapts sky color to current sun phase.
 */
export function CloudCanvas({ sunPhase, opacity = 1, density = 0.5, flash = 0 }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const flashRef = useRef(flash);
  flashRef.current = flash;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // Enable alpha blending so cloud transparency works over the background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // Set canvas size to match container
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Compile shaders and link program
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Fullscreen quad
    const vertices = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iResLoc = gl.getUniformLocation(program, 'iResolution');
    const uSkyLoc = gl.getUniformLocation(program, 'uSkyColor');
    const uDensityLoc = gl.getUniformLocation(program, 'uDensity');
    const uFlashLoc = gl.getUniformLocation(program, 'uFlash');

    const skyColor = SKY_COLORS[sunPhase];

    const render = (t: number) => {
      t *= 0.001;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(iTimeLoc, t);
      gl.uniform2f(iResLoc, canvas.width, canvas.height);
      gl.uniform3f(uSkyLoc, skyColor[0], skyColor[1], skyColor[2]);
      gl.uniform1f(uDensityLoc, density);
      gl.uniform1f(uFlashLoc, flashRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [sunPhase]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
      }}
    />
  );
}
