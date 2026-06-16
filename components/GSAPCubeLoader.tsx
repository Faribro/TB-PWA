'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const GSAPCubeLoader = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cubes = containerRef.current.querySelectorAll('.cube');
    
    cubes.forEach((cube, i) => {
      const h = Math.floor(i / 9) + 1;
      const w = Math.floor((i % 9) / 3) + 1;
      const l = (i % 3) + 1;

      gsap.to(cube, {
        x: `${(w * -50 - 50) + (l * 50 + 50)}%`,
        y: `${(h * 50 - 200) + (w * 25 - 25) + (l * 25 + 25)}%`,
        duration: 3,
        ease: 'power1.inOut',
        repeat: -1,
        keyframes: [
          { x: `${(w * -50 - 50) + (l * 100 - 50)}%`, y: `${(h * 50 - 200) + (w * 25 - 25) + (l * 50 - 25)}%`, duration: 0.42 },
          { x: `${(w * -100 + 50) + (l * 100 - 50)}%`, y: `${(h * 50 - 200) + (w * 50 - 75) + (l * 50 - 25)}%`, duration: 0.42 },
          { x: `${(w * -100 - 100) + (l * 100 + 100)}%`, y: `${(h * 100 - 400) + (w * 50 - 50) + (l * 50 + 50)}%`, duration: 0.45 },
          { x: `${(w * -100 - 100) + (l * 50 + 200)}%`, y: `${(h * 100 - 400) + (w * 50 - 50) + (l * 25 + 100)}%`, duration: 0.42 },
          { x: `${(w * -50 - 200) + (l * 50 + 200)}%`, y: `${(h * 100 - 375) + (w * 25 - 25) + (l * 25 + 100)}%`, duration: 0.42 },
          { x: `${(w * -50 - 50) + (l * 50 + 50)}%`, y: `${(h * 50 - 200) + (w * 25 - 25) + (l * 25 + 25)}%`, duration: 0.42 },
        ],
      });
    });

    return () => {
      gsap.killTweensOf(cubes);
    };
  }, []);

  const renderCube = (h: number, w: number, l: number) => (
    <div key={`h${h}w${w}l${l}`} className="cube" style={{ zIndex: -h }}>
      <div className="face top" />
      <div className="face left" />
      <div className="face right" />
    </div>
  );

  return (
    <div className="flex items-center justify-center">
      <div ref={containerRef} className="cube-container">
        {[1, 2, 3].map(h => (
          <div key={`h${h}`} className={`h${h}Container`}>
            {[1, 2, 3].map(w => (
              [1, 2, 3].map(l => renderCube(h, w, l))
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        .cube-container {
          position: relative;
          height: 100px;
          width: 86px;
          transform: scale(0.5);
        }

        .cube {
          position: absolute;
          width: 86px;
          height: 100px;
        }

        .face {
          height: 50px;
          width: 50px;
          position: absolute;
          transform-origin: 0 0;
        }

        .right {
          background: #E79C10;
          transform: rotate(-30deg) skewX(-30deg) translate(49px, 65px) scaleY(0.86);
        }

        .left {
          background: #D53A33;
          transform: rotate(90deg) skewX(-30deg) scaleY(0.86) translate(25px, -50px);
        }

        .top {
          background: #1d9099;
          transform: rotate(210deg) skew(-30deg) translate(-75px, -22px) scaleY(0.86);
          z-index: 2;
        }
      `}</style>
    </div>
  );
};
