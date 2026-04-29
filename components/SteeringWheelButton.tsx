'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SteeringWheelButtonProps {
  onClick: () => void;
  isActive: boolean;
}

export function SteeringWheelButton({ onClick, isActive }: SteeringWheelButtonProps) {
  const [isRotating, setIsRotating] = useState(false);

  const handleClick = () => {
    // Play steering rotation sound
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Create a realistic steering wheel rotation sound
      const duration = 0.4;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Low frequency rumble for mechanical feel
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + duration);
      
      // Lowpass filter for muffled mechanical sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
      filter.Q.value = 5;
      
      // Envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio play failed, ignore
    }

    // Trigger rotation animation
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 600);
    
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
        isActive 
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.4)]' 
          : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/50 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
      } border-2 backdrop-blur-xl`}
      animate={{
        rotate: isRotating ? 360 : 0,
        scale: isActive ? 1.05 : 1
      }}
      transition={{
        rotate: {
          duration: 0.6,
          ease: [0.25, 0.1, 0.25, 1]
        },
        scale: {
          duration: 0.3
        }
      }}
    >
      {/* Premium Ship's Steering Wheel SVG */}
      <svg
        viewBox="0 0 100 100"
        className={`w-12 h-12 ${isActive ? 'text-amber-400' : 'text-slate-400'} transition-colors duration-300`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Outer rim */}
        <circle cx="50" cy="50" r="40" strokeWidth="3" />
        
        {/* Inner rim */}
        <circle cx="50" cy="50" r="32" strokeWidth="1.5" opacity="0.6" />
        
        {/* Center hub */}
        <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.2" strokeWidth="2" />
        
        {/* Spokes - 8 spokes like a ship's wheel */}
        <g strokeWidth="2">
          <line x1="50" y1="10" x2="50" y2="38" />
          <line x1="50" y1="62" x2="50" y2="90" />
          <line x1="10" y1="50" x2="38" y2="50" />
          <line x1="62" y1="50" x2="90" y2="50" />
          
          {/* Diagonal spokes */}
          <line x1="22" y1="22" x2="39" y2="39" />
          <line x1="61" y1="61" x2="78" y2="78" />
          <line x1="78" y1="22" x2="61" y2="39" />
          <line x1="39" y1="61" x2="22" y2="78" />
        </g>
        
        {/* Handle grips at ends of spokes */}
        <g fill="currentColor" opacity="0.8">
          <circle cx="50" cy="10" r="3" />
          <circle cx="50" cy="90" r="3" />
          <circle cx="10" cy="50" r="3" />
          <circle cx="90" cy="50" r="3" />
          <circle cx="22" cy="22" r="2.5" />
          <circle cx="78" cy="78" r="2.5" />
          <circle cx="78" cy="22" r="2.5" />
          <circle cx="22" cy="78" r="2.5" />
        </g>
        
        {/* Brass studs on rim */}
        <g fill="currentColor" opacity="0.4">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 36 * Math.cos(rad);
            const y = 50 + 36 * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="1.5" />;
          })}
        </g>
      </svg>
      
      {/* Active glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  );
}
