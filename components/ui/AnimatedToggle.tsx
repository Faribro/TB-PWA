'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'neon' | 'minimal';
}

export function AnimatedToggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  variant = 'neon'
}: AnimatedToggleProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sizes = {
    sm: { width: 36, height: 20, knob: 16, padding: 2 },
    md: { width: 44, height: 24, knob: 20, padding: 2 },
    lg: { width: 56, height: 32, knob: 28, padding: 2 }
  };

  const config = sizes[size];
  const knobOffset = config.width - config.knob - config.padding * 2;

  return (
    <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative" style={{ width: config.width, height: config.height }}>
        {/* Hidden input for accessibility */}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          role="switch"
          aria-checked={checked}
        />

        {variant === 'neon' && (
          <>
            {/* Outer base with neumorphic shadow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: checked
                  ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(16,185,129,0.3)'
                  : 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              animate={{
                background: checked
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
              }}
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            />

            {/* Neon glow ring */}
            {isMounted && (
              <motion.svg
                className="absolute inset-0 pointer-events-none"
                viewBox={`0 0 ${config.width} ${config.height}`}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <filter id={`glow-${size}`}>
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id={`gradient-${size}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <motion.rect
                  x="1"
                  y="1"
                  width={config.width - 2}
                  height={config.height - 2}
                  rx={config.height / 2}
                  fill="none"
                  stroke={`url(#gradient-${size})`}
                  strokeWidth="1.5"
                  filter={`url(#glow-${size})`}
                  initial={{ strokeDasharray: `0 ${config.width * 2} 0`, opacity: 0 }}
                  animate={{
                    strokeDasharray: checked ? `${config.width * 2} 0 0` : `0 ${config.width * 2} 0`,
                    opacity: checked ? 1 : 0
                  }}
                  transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                />
              </motion.svg>
            )}

            {/* LED indicator */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                top: 4,
                left: 4
              }}
              animate={{
                backgroundColor: checked ? '#10b981' : '#ef4444',
                boxShadow: checked
                  ? '0 0 4px rgba(16,185,129,0.8), 0 0 8px rgba(16,185,129,0.4)'
                  : '0 0 4px rgba(239,68,68,0.8), 0 0 8px rgba(239,68,68,0.4)'
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Knob shadow */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: config.knob,
                height: config.knob,
                top: config.padding,
                boxShadow: '2px 2px 4px rgba(0,0,0,0.4)'
              }}
              animate={{
                left: checked ? knobOffset + config.padding : config.padding
              }}
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            />

            {/* Knob with gradient and neon ring */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: config.knob,
                height: config.knob,
                top: config.padding,
                background: 'radial-gradient(circle at 40% 40%, #334155 0%, #1e293b 50%, #0f172a 100%)',
                boxShadow: 'inset -1px -1px 2px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.1)'
              }}
              animate={{
                left: checked ? knobOffset + config.padding : config.padding
              }}
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            >
              {/* Knob neon ring */}
              {isMounted && checked && (
                <motion.svg
                  className="absolute inset-0"
                  viewBox={`0 0 ${config.knob} ${config.knob}`}
                  style={{ overflow: 'visible' }}
                >
                  <motion.circle
                    cx={config.knob / 2}
                    cy={config.knob / 2}
                    r={config.knob / 2 - 2}
                    fill="none"
                    stroke="url(#gradient-knob)"
                    strokeWidth="1"
                    initial={{ strokeDasharray: '0 100 0', opacity: 0 }}
                    animate={{ strokeDasharray: '50 0 50', opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                  />
                  <defs>
                    <linearGradient id="gradient-knob" x1="0.7" y1="0" x2="0.3" y2="1">
                      <stop offset="25%" stopColor="rgba(16,185,129,0)" />
                      <stop offset="50%" stopColor="rgba(16,185,129,0.5)" />
                      <stop offset="100%" stopColor="rgba(52,211,153,0.5)" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              )}
            </motion.div>
          </>
        )}

        {variant === 'minimal' && (
          <>
            {/* Minimal track */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                backgroundColor: checked ? '#10b981' : '#cbd5e1'
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Minimal knob */}
            <motion.div
              className="absolute bg-white rounded-full shadow-md"
              style={{
                width: config.knob,
                height: config.knob,
                top: config.padding
              }}
              animate={{
                left: checked ? knobOffset + config.padding : config.padding
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </>
        )}

        {variant === 'default' && (
          <>
            {/* Default track */}
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              animate={{
                backgroundColor: checked ? '#10b981' : '#e2e8f0',
                borderColor: checked ? '#10b981' : '#cbd5e1'
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Default knob */}
            <motion.div
              className="absolute bg-white rounded-full shadow-sm"
              style={{
                width: config.knob - 4,
                height: config.knob - 4,
                top: config.padding + 2
              }}
              animate={{
                left: checked ? knobOffset + config.padding : config.padding + 2
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          </>
        )}
      </div>

      {label && (
        <span className="text-sm font-medium text-slate-700 select-none">
          {label}
        </span>
      )}
    </label>
  );
}
