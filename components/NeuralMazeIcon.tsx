'use client';

import { useRef, useEffect, memo } from 'react';

interface NeuralMazeIconProps {
  color: string;
  dotColor: string;
}

const GRID_SIZE = 15; // Higher density for small area

export const NeuralMazeIcon = memo<NeuralMazeIconProps>(({ color, dotColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeRef = useRef<number[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const setup = () => {
      const size = canvas.parentElement?.clientWidth || 120;
      canvas.width = size;
      canvas.height = size;

      // Simple Procedural Grid for Icon Background
      const grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(0).map(() => Math.random() > 0.7 ? 1 : 0)
      );
      mazeRef.current = grid;
    };

    const render = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const size = canvas.width;
      const cellSize = size / GRID_SIZE;

      ctx.clearRect(0, 0, size, size);
      
      // Draw Architectural Grid
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.15;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (mazeRef.current[y][x] === 1) {
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      // Draw Moving "Data Signals"
      const signalTime = time * 0.001;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = dotColor;
      
      for (let i = 0; i < 5; i++) {
        const offset = i * 2;
        const x = (Math.floor(signalTime + offset) % GRID_SIZE) * cellSize + cellSize / 2;
        const y = (Math.floor(signalTime * 0.5 + offset) % GRID_SIZE) * cellSize + cellSize / 2;
        
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Signal Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = dotColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrame = requestAnimationFrame(render);
    };

    setup();
    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, [color, dotColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-60"
    />
  );
});

NeuralMazeIcon.displayName = 'NeuralMazeIcon';
