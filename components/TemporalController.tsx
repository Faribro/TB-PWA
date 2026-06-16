'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEntityStore } from '@/stores/useEntityStore';
import { cn } from '@/lib/utils';

export function TemporalController() {
  const isTemporalMode = useEntityStore(s => s.isTemporalMode);
  const timeRange = useEntityStore(s => s.timeRange);
  const currentPlayhead = useEntityStore(s => s.currentPlayhead);
  const isPlaying = useEntityStore(s => s.isPlaying);
  
  const setTemporalMode = useEntityStore(s => s.setTemporalMode);
  const setCurrentPlayhead = useEntityStore(s => s.setCurrentPlayhead);
  const setIsPlaying = useEntityStore(s => s.setIsPlaying);

  // Generate 40 fake data points for the visualizer bars
  const [barData] = useState(() => Array.from({ length: 40 }, () => Math.floor(Math.random() * 80) + 10));

  // Slowed down playback: 1.5 days per real second
  const MS_PER_REAL_SECOND = 1.5 * 24 * 60 * 60 * 1000;
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number | undefined>(undefined);

  // Presentation state tracking (to avoid duplicate triggers during the loop)
  const setSonicActivePresentationCue = useEntityStore(s => s.setSonicActivePresentationCue);
  const isPausedForSonic = useEntityStore(s => s.isPausedForSonic);
  
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
  const [hasSpokenMidpoint, setHasSpokenMidpoint] = useState(false);
  const [hasSpokenOutro, setHasSpokenOutro] = useState(false);

  // Animation loop for automatic playback
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined) {
        const deltaTime = time - lastTimeRef.current;
        
        // Pause playback if Sonic is speaking his insight
        if (isPlaying && !isPausedForSonic) {
          // Increment playhead based on delta time
          const newPlayhead = currentPlayhead + (deltaTime / 1000) * MS_PER_REAL_SECOND;
          const progressPercent = Math.max(0, Math.min(100, ((newPlayhead - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100));
          
          // Cinematic Presentation Orchestration
          if (progressPercent > 2 && !hasSpokenIntro) {
            setSonicActivePresentationCue({ type: 'intro', timestamp: newPlayhead });
            setHasSpokenIntro(true);
          } else if (progressPercent > 50 && !hasSpokenMidpoint) {
            setSonicActivePresentationCue({ type: 'midpoint', timestamp: newPlayhead });
            setHasSpokenMidpoint(true);
          } else if (progressPercent > 95 && !hasSpokenOutro) {
            setSonicActivePresentationCue({ type: 'outro', timestamp: newPlayhead });
            setHasSpokenOutro(true);
          }

          if (newPlayhead >= timeRange[1]) {
            setCurrentPlayhead(timeRange[1]);
            setIsPlaying(false);
          } else {
            setCurrentPlayhead(newPlayhead);
          }
        }
      }
      
      lastTimeRef.current = time;
      if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isPausedForSonic, currentPlayhead, timeRange, MS_PER_REAL_SECOND, setCurrentPlayhead, setIsPlaying, hasSpokenIntro, hasSpokenMidpoint, hasSpokenOutro, setSonicActivePresentationCue]);

  // Reset presentation triggers when playback is fully reset or temporal mode is deactivated
  useEffect(() => {
    if (!isTemporalMode || (currentPlayhead === timeRange[0])) {
      setHasSpokenIntro(false);
      setHasSpokenMidpoint(false);
      setHasSpokenOutro(false);
    }
  }, [isTemporalMode, currentPlayhead, timeRange]);

  const progressPercent = Math.max(0, Math.min(100, ((currentPlayhead - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100));
  const activeBarIndex = Math.min(barData.length - 1, Math.floor((progressPercent / 100) * barData.length));

  // Return null because the user requested the playback frame UI to be removed.
  // The component now runs purely as a background logic controller driving the global currentPlayhead state.
  return null;
}
