'use client';

import { useCallback } from 'react';

export type HapticIntensity = 'light' | 'medium' | 'heavy';

interface HapticFeedbackOptions {
  intensity?: HapticIntensity;
  duration?: number;
}

/**
 * Visual haptic feedback hook - mimics physical haptic responses
 * with scale + opacity micro-animations
 */
export function useHapticFeedback() {
  const trigger = useCallback((element: HTMLElement | null, options: HapticFeedbackOptions = {}) => {
    if (!element) return;

    const { intensity = 'medium', duration = 150 } = options;
    
    const scaleMap = {
      light: 0.98,
      medium: 0.95,
      heavy: 0.92
    };

    const scale = scaleMap[intensity];
    
    // Apply transform
    element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.transform = `scale(${scale})`;
    
    // Reset after duration
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, duration);
  }, []);

  return { trigger };
}

/**
 * Ripple effect component for button clicks
 */
export function createRipple(event: React.MouseEvent<HTMLElement>, color: string = 'rgba(255, 255, 255, 0.6)') {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  
  const ripple = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;
  
  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.background = color;
  ripple.style.transform = 'scale(0)';
  ripple.style.animation = 'ripple 600ms ease-out';
  ripple.style.pointerEvents = 'none';
  
  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}
