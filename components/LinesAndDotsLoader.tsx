'use client';

import React, { useState, useEffect } from 'react';

interface LinesAndDotsLoaderProps {
  progress?: number;
}

export function LinesAndDotsLoader({ progress }: LinesAndDotsLoaderProps) {
  const [animatedProgress, setAnimatedProgress] = useState(1);
  const sectors = new Array(60).fill(null);
  const radius = 4.25; // in ems

  useEffect(() => {
    if (animatedProgress >= 100) return;
    
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        const increment = Math.random() * 15 + 5;
        const next = Math.min(prev + increment, 99);
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [animatedProgress]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="relative">
        <div className="lines-and-dots">
          {sectors.map((_, i) => {
            const fraction = i / sectors.length;
            const sectorStyle: React.CSSProperties = {
              animationDelay: `calc(var(--anim-dur) * ${-fraction})`,
              transform: `rotate(${-fraction * 360}deg) translateY(${radius}em)`
            };

            return (
              <div
                key={`sector-${i + 1}`}
                className="lines-and-dots__sector"
                style={sectorStyle}
              >
                <div className="lines-and-dots__line"></div>
                <div className="lines-and-dots__dot"></div>
                <div className="lines-and-dots__dot"></div>
              </div>
            );
          })}
        </div>
        
        {/* Progress percentage in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-black text-black">
              {Math.round(animatedProgress)}%
            </div>
          </div>
        </div>
      </div>
      <div className="text-slate-500 text-sm font-medium">Loading...</div>
    </div>
  );
}
