'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

function SecurityGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;

    const drawSecurityGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dot grid pattern
      const spacing = 20;
      const dotSize = 1;
      
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          ctx.fillStyle = 'rgba(229, 231, 235, 0.6)'; // slate-200
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ashoka Chakra watermark (24 spokes)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      
      ctx.strokeStyle = 'rgba(0, 74, 153, 0.02)'; // Alliance Blue at 2% opacity
      ctx.lineWidth = 2;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      
      // 24 spokes
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI * 2) / 24;
        const x1 = centerX + Math.cos(angle) * (radius * 0.15);
        const y1 = centerY + Math.sin(angle) * (radius * 0.15);
        const x2 = centerX + Math.cos(angle) * radius;
        const y2 = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    const animate = () => {
      drawSecurityGrid();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function NeuralNodeIndicator() {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="relative">
        {/* Pulsing glow */}
        <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
        {/* Core dot */}
        <div className="relative w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
      </div>
      <p className="mt-2 text-[8px] font-mono text-slate-400 uppercase tracking-widest">
        System Healthy
      </p>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Server-side authorization check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      redirect('/login?reason=unauthorized');
    }
    
    const role = session?.user?.role;
    if (role !== 'admin' && role !== 'PM') {
      redirect('/unauthorized');
    }
  }, [session, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">
            Verifying Credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <SecurityGridBackground />
      <NeuralNodeIndicator />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
