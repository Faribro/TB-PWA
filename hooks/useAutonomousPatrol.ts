'use client';

import { useEffect, useRef } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';
import { usePathname } from 'next/navigation';

// Sample district coordinates for patrol (India map)
const PATROL_DISTRICTS = [
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

export function useAutonomousPatrol() {
  const pathname = usePathname();
  const patrolIndexRef = useRef(0);
  const patrolTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const state = useEntityStore(s => s.state);
  const mode = useEntityStore(s => s.mode);
  const moveTo = useEntityStore(s => s.moveTo);
  const setState = useEntityStore(s => s.setState);
  const setMode = useEntityStore(s => s.setMode);
  const districtData = useEntityStore(s => s.districtData);
  const alertQueue = useEntityStore(s => s.alertQueue);
  const mapInstance = useEntityStore(s => s.mapInstance);
  
  // Detect critical alerts and fly to them
  useEffect(() => {
    if (alertQueue.length > 0 && state !== 'alerting') {
      const criticalAlert = alertQueue.find(a => a.severity === 'critical');
      
      if (criticalAlert) {
        // Find district coordinates
        const district = PATROL_DISTRICTS.find(
          d => d.name.toLowerCase().includes(criticalAlert.district.toLowerCase())
        );
        
        if (district) {
          setState('alerting');
          setMode('macro');
          moveTo(district.lat, district.lng, district.name);
          
          // Speak alert after 2 seconds
          setTimeout(() => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(
                `Critical alert in ${criticalAlert.district}. ${criticalAlert.message}`
              );
              utterance.rate = 0.92;
              utterance.pitch = 1.05;
              utterance.lang = 'en-IN';
              speechSynthesis.speak(utterance);
            }
          }, 2000);
          
          // Return to patrol after 10 seconds
          setTimeout(() => {
            setState('patrolling');
            setMode('micro');
          }, 10000);
        }
      }
    }
  }, [alertQueue, state, setState, setMode, moveTo]);
  
  // Autonomous patrol on dashboard
  useEffect(() => {
    if (pathname !== '/dashboard' || !mapInstance) return;
    
    // Start patrol after 5 seconds of idle
    idleTimerRef.current = setTimeout(() => {
      if (state === 'idle') {
        setState('patrolling');
        setMode('micro');
        startPatrol();
      }
    }, 5000);
    
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (patrolTimerRef.current) clearInterval(patrolTimerRef.current);
    };
  }, [pathname, mapInstance, state]);
  
  const startPatrol = () => {
    if (patrolTimerRef.current) clearInterval(patrolTimerRef.current);
    
    // Visit each district every 8 seconds
    patrolTimerRef.current = setInterval(() => {
      if (state !== 'patrolling') return;
      
      const district = PATROL_DISTRICTS[patrolIndexRef.current];
      moveTo(district.lat, district.lng, district.name);
      
      // Check for breaches in this district
      const districtMetrics = districtData.find(
        d => d.district.toLowerCase().includes(district.name.toLowerCase())
      );
      
      if (districtMetrics && districtMetrics.breachRate > 0.7) {
        // Pause patrol and investigate
        setState('investigating');
        setMode('normal');
        
        setTimeout(() => {
          setState('patrolling');
          setMode('micro');
        }, 5000);
      }
      
      patrolIndexRef.current = (patrolIndexRef.current + 1) % PATROL_DISTRICTS.length;
    }, 8000);
  };
  
  return { startPatrol };
}
