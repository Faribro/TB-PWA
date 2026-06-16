'use client';

import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface AnimatedTitleProps {
  title: string;
  className?: string;
}

export const AnimatedTitle = ({ title, className = '' }: AnimatedTitleProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const words = containerRef.current.querySelectorAll('.animated-word');

    gsap.fromTo(
      words,
      {
        opacity: 0,
        y: 20,
        rotateX: -90,
      },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        stagger: 0.02,
        ease: 'power2.out',
        duration: 0.5,
      }
    );
  }, { dependencies: [title], scope: containerRef });

  const words = title.split(' ');

  return (
    <div ref={containerRef} className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="animated-word inline-block mr-[0.3em]"
          style={{ transformOrigin: 'bottom' }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};
