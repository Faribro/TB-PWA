'use client';

import { useEffect, useRef } from 'react';

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clinical strings injected into matrix
    const clinicalChars = 'TB HIV OCS PM SPM HHXR NACO SACS ATT NIKSHAY';
    const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*';
    const allChars = clinicalChars + matrixChars;
    
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      // Fade effect
      ctx.fillStyle = 'rgba(10, 15, 10, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Matrix green
      ctx.fillStyle = '#33ff99';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly pick from clinical or matrix chars
        const text = allChars[Math.floor(Math.random() * allChars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        // Reset drop randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
    />
  );
}
