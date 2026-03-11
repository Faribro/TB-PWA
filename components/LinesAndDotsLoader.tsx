'use client';

import React from 'react';

interface LinesAndDotsLoaderProps {
  progress: number;
}

export function LinesAndDotsLoader({ progress }: LinesAndDotsLoaderProps) {
  const sectors = new Array(60).fill(null);
  const radius = 4.25; // in ems

  return (
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
            {Math.min(Math.round(progress), 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
