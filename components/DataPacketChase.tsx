'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database } from 'lucide-react';
import { playDataPacketChase, playSuccessChime } from '@/lib/audioFeedback';

interface DataPacket {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function DataPacketChase() {
  const [packets, setPackets] = useState<DataPacket[]>([]);

  useEffect(() => {
    const handleDataSync = (event: CustomEvent) => {
      const { sourceElement } = event.detail;
      
      if (!sourceElement) return;

      const rect = sourceElement.getBoundingClientRect();
      const targetElement = document.querySelector('[data-sync-target="master"]');
      
      if (!targetElement) return;

      const targetRect = targetElement.getBoundingClientRect();

      const packet: DataPacket = {
        id: `packet-${Date.now()}`,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2,
      };

      setPackets(prev => [...prev, packet]);
      playDataPacketChase();

      setTimeout(() => {
        setPackets(prev => prev.filter(p => p.id !== packet.id));
        playSuccessChime();
      }, 1000);
    };

    window.addEventListener('data-sync' as any, handleDataSync);
    return () => window.removeEventListener('data-sync' as any, handleDataSync);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {packets.map(packet => (
          <motion.div
            key={packet.id}
            initial={{
              x: packet.startX,
              y: packet.startY,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: packet.endX,
              y: packet.endY,
              scale: 0.5,
              opacity: 0.8,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute"
          >
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center justify-center">
                <Database className="w-3 h-3 text-white" />
              </div>
              
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full bg-emerald-500/30"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper function to trigger data packet animation
export function triggerDataPacketChase(sourceElement: HTMLElement) {
  const event = new CustomEvent('data-sync', {
    detail: { sourceElement },
  });
  window.dispatchEvent(event);
}
