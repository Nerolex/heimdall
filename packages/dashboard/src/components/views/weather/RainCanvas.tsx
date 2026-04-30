import React, { useRef, useEffect } from 'react';

interface Props {
  opacity?: number;
  /** Rain intensity: 0.0 = light, 1.0 = heavy. Default 0.5 */
  intensity?: number;
}

interface RainDrop {
  x: number;
  y: number;
  scale: number;
  length: number;
  vx: number;
  vy: number;
  ay: number;
  theta: number;
}

function createDrop(width: number, height: number, randomY: boolean): RainDrop {
  const scale = 0.2 + Math.random() * 0.8;
  const vx = -(1 + Math.random() * 0.5) * scale;
  const vy = 3 * scale;
  const theta = Math.atan2(vy, vx);
  const length = 20 * scale;

  return {
    x: Math.random() * (width + 100),
    y: randomY ? Math.random() * height : -length,
    scale,
    length,
    vx,
    vy,
    ay: 0.01 * scale,
    theta,
  };
}

/**
 * Full-screen animated diagonal rain using Canvas 2D.
 * Streaks fall diagonally with wind, accelerating downward.
 */
export function RainCanvas({ opacity = 1, intensity = 0.5 }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<RainDrop[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initial batch of drops spread across the screen
    const dropCount = Math.floor(200 + intensity * 800);
    dropsRef.current = [];
    for (let i = 0; i < dropCount; i++) {
      dropsRef.current.push(createDrop(canvas.width, canvas.height, true));
    }

    const newDropsPerFrame = Math.floor(2 + intensity * 8);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;

      const drops = dropsRef.current;

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(
          d.x + d.length * Math.cos(d.theta),
          d.y + d.length * Math.sin(d.theta)
        );
        ctx.stroke();

        // Update position
        d.x += d.vx;
        d.y += d.vy;
        d.vy += d.ay;

        // Remove if off screen
        if (d.y > canvas.height + 20 || d.x < -50) {
          drops.splice(i, 1);
        }
      }

      // Spawn new drops at top
      for (let i = 0; i < newDropsPerFrame; i++) {
        drops.push(createDrop(canvas.width, canvas.height, false));
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

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
