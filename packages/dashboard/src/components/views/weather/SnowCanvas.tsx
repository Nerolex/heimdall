import React, { useRef, useEffect } from 'react';

interface Props {
  opacity?: number;
  /** Snow intensity: 0.0 = light flurries, 1.0 = blizzard. Default 0.5 */
  intensity?: number;
}

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  swing: number;
  swingSpeed: number;
  phase: number;
}

function createFlake(width: number, height: number, randomY: boolean): Snowflake {
  const radius = 1 + Math.random() * 3;
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -radius * 2,
    radius,
    vx: 0,
    vy: 0.3 + radius * 0.3,
    swing: 20 + Math.random() * 30,
    swingSpeed: 0.01 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
  };
}

/**
 * Full-screen animated snowfall using Canvas 2D.
 * Flakes drift down with gentle horizontal swaying.
 */
export function SnowCanvas({ opacity = 1, intensity = 0.5 }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const flakesRef = useRef<Snowflake[]>([]);

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

    // Initial snowflakes spread across screen
    const flakeCount = Math.floor(100 + intensity * 300);
    flakesRef.current = [];
    for (let i = 0; i < flakeCount; i++) {
      flakesRef.current.push(createFlake(canvas.width, canvas.height, true));
    }

    const newFlakesPerFrame = Math.floor(1 + intensity * 3);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const flakes = flakesRef.current;

      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];

        // Gentle horizontal sway
        f.phase += f.swingSpeed;
        f.vx = Math.sin(f.phase) * 0.3;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + f.radius * 0.15})`;
        ctx.fill();

        // Update position
        f.x += f.vx;
        f.y += f.vy;

        // Remove if off screen
        if (f.y > canvas.height + 10 || f.x < -20 || f.x > canvas.width + 20) {
          flakes.splice(i, 1);
        }
      }

      // Spawn new flakes at top
      for (let i = 0; i < newFlakesPerFrame; i++) {
        flakes.push(createFlake(canvas.width, canvas.height, false));
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
