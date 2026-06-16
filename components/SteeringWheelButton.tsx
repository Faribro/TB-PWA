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
      
      const duration = 0.4;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + duration);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
      filter.Q.value = 5;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio play failed, ignore
    }

    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 600);
    
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
        isActive 
          ? 'bg-gradient-to-br from-amber-500/35 to-amber-900/20 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]' 
          : 'bg-gradient-to-br from-slate-800/80 to-slate-950/90 border-slate-700 hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
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
      {/* Premium 3D Ship's Steering Wheel SVG */}
      <svg
        viewBox="0 0 100 100"
        className="w-12 h-12 transition-all duration-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Mahogany wood linear gradient for outer rim and handles */}
          <linearGradient id="mahogany-wood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" /> {/* Amber 600 */}
            <stop offset="30%" stopColor="#78350f" /> {/* Amber 900 */}
            <stop offset="70%" stopColor="#451a03" /> {/* Amber 950 */}
            <stop offset="100%" stopColor="#92400e" /> {/* Amber 800 */}
          </linearGradient>

          {/* Shiny metallic brass gradient for rim accent, center hub, etc. */}
          <linearGradient id="brass-metal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" /> {/* Yellow 200 */}
            <stop offset="20%" stopColor="#ca8a04" /> {/* Yellow 600 */}
            <stop offset="45%" stopColor="#fef9c3" /> {/* Yellow 100 */}
            <stop offset="75%" stopColor="#854d0e" /> {/* Yellow 800 */}
            <stop offset="100%" stopColor="#eab308" /> {/* Yellow 500 */}
          </linearGradient>

          {/* Horizontal cylindrical brass gradient for spokes */}
          <linearGradient id="brass-spoke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#854d0e" />
            <stop offset="25%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#fef9c3" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>

          {/* 3D Hub Radial Gradient for center bolt dome */}
          <radialGradient id="brass-hub-dome" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="40%" stopColor="#ca8a04" />
            <stop offset="85%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#451a03" />
          </radialGradient>

          {/* Drop shadow filter */}
          <filter id="svg-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0.8" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.8"/>
          </filter>
        </defs>

        {/* Rotated spokes and handle grips */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            {/* Spoke shaft */}
            <rect x="48" y="10" width="4" height="28" fill="url(#brass-spoke)" filter="url(#svg-shadow)" />
            
            {/* Connector collar */}
            <rect x="47" y="8" width="6" height="3" rx="0.5" fill="url(#brass-metal)" />
            
            {/* Turned wood handle */}
            <path 
              d="M 48 8 
                 C 48 5, 47 4.5, 47 2.5 
                 C 47 0.5, 53 0.5, 53 2.5 
                 C 53 4.5, 52 5, 52 8 Z" 
              fill="url(#mahogany-wood)" 
              filter="url(#svg-shadow)" 
            />
            
            {/* Brass endcap stud */}
            <circle cx="50" cy="1" r="1.5" fill="url(#brass-metal)" />
          </g>
        ))}

        {/* Outer Rim (Mahogany Wood) */}
        <circle cx="50" cy="50" r="39" stroke="url(#mahogany-wood)" strokeWidth="4.5" fill="none" filter="url(#svg-shadow)" />

        {/* Inner Rim Accent (Brass Ring inset on the wood) */}
        <circle cx="50" cy="50" r="34.5" stroke="url(#brass-metal)" strokeWidth="1" fill="none" opacity="0.85" />
        
        {/* Secondary Inner Rim (Wood accent ring) */}
        <circle cx="50" cy="50" r="30.5" stroke="url(#mahogany-wood)" strokeWidth="1.5" fill="none" opacity="0.75" />

        {/* Center Hub Outer Ring (Brass) */}
        <circle cx="50" cy="50" r="14" fill="url(#brass-metal)" filter="url(#svg-shadow)" />
        
        {/* Hub Inlay (Wood) */}
        <circle cx="50" cy="50" r="10" fill="url(#mahogany-wood)" />
        
        {/* Center Cap (Brass Dome Nut) */}
        <circle cx="50" cy="50" r="6" fill="url(#brass-hub-dome)" filter="url(#svg-shadow)" />
        
        {/* Center Pin Screw */}
        <circle cx="50" cy="50" r="1.8" fill="#1c1917" />
      </svg>
      
      {/* Active glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-500/25 blur-xl"
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.25, 1]
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
