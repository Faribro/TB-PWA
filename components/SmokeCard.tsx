'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface SmokeCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SmokeCard = ({ children, className = '' }: SmokeCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.3]);
  const blur = useTransform(scrollYProgress, [0, 0.1], [0, 8]);

  return (
    <motion.div
      ref={cardRef}
      className={className}
      style={{
        opacity,
        filter: blur.get() ? `blur(${blur.get()}px)` : 'blur(0px)',
      }}
    >
      {children}
    </motion.div>
  );
};
