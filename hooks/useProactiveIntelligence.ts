'use client';

import { useEffect, useRef } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

interface BreachPattern {
  district: string;
  consecutiveDays: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export function useProactiveIntelligence() {
  const lastCheckRef = useRef<number>(Date.now());
  const breachHistoryRef = useRef<Map<string, number[]>>(new Map());
  
  const districtData = useEntityStore(s => s.districtData);
  const setState = useEntityStore(s => s.setState);
  const setMode = useEntityStore(s => s.setMode);
  const moveTo = useEntityStore(s => s.moveTo);
  const userPatterns = useEntityStore(s => s.userPatterns);
  const learnPattern = useEntityStore(s => s.learnPattern);
  
  // Detect breach patterns
  useEffect(() => {
    if (districtData.length === 0) return;
    
    const now = Date.now();
    const hoursSinceLastCheck = (now - lastCheckRef.current) / (1000 * 60 * 60);
    
    // Check every 4 hours
    if (hoursSinceLastCheck < 4) return;
    
    lastCheckRef.current = now;
    
    // Track breach streaks
    const patterns: BreachPattern[] = [];
    
    districtData.forEach(district => {
      if (district.breachRate > 0.5) {
        const history = breachHistoryRef.current.get(district.district) || [];
        history.push(district.breachRate);
        
        // Keep last 7 days
        if (history.length > 7) history.shift();
        
        breachHistoryRef.current.set(district.district, history);
        
        // Detect consecutive breaches
        if (history.length >= 3 && history.every(rate => rate > 0.5)) {
          const trend = history[history.length - 1] > history[0] ? 'increasing' : 'decreasing';
          
          patterns.push({
            district: district.district,
            consecutiveDays: history.length,
            trend,
          });
        }
      }
    });
    
    // Proactive alert for patterns
    if (patterns.length > 0) {
      const worstPattern = patterns.sort((a, b) => b.consecutiveDays - a.consecutiveDays)[0];
      
      if (worstPattern.consecutiveDays >= 3) {
        proactiveAlert(
          `I've noticed ${worstPattern.district} has been breaching SLA for ${worstPattern.consecutiveDays} consecutive days. ` +
          `The trend is ${worstPattern.trend}. Would you like me to investigate?`
        );
      }
    }
  }, [districtData]);
  
  // Learn user behavior
  useEffect(() => {
    const hour = new Date().getHours();
    
    // Morning briefing (9 AM)
    if (hour === 9 && userPatterns.activeHours.filter(h => h === 9).length === 0) {
      setTimeout(() => {
        morningBriefing();
      }, 2000);
    }
    
    // Late night detection (after 10 PM)
    if (hour >= 22 && userPatterns.activeHours.filter(h => h >= 22).length > 3) {
      setTimeout(() => {
        proactiveAlert(
          "You've been working late frequently. Would you like a quick summary of critical issues?"
        );
      }, 5000);
    }
  }, [userPatterns]);
  
  const proactiveAlert = (message: string) => {
    setState('reporting');
    setMode('normal');
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.lang = 'en-IN';
      speechSynthesis.speak(utterance);
    }
    
    // Return to patrol after speaking
    setTimeout(() => {
      setState('patrolling');
      setMode('micro');
    }, message.length * 80); // ~80ms per character
  };
  
  const morningBriefing = () => {
    const criticalDistricts = districtData.filter(d => d.breachRate > 0.7);
    const highYieldDistricts = districtData.filter(
      d => d.diagnosed / d.screened > 0.15 && d.screened > 50
    );
    
    let briefing = "Good morning! Here's your daily briefing. ";
    
    if (criticalDistricts.length > 0) {
      briefing += `${criticalDistricts.length} districts have critical breach rates. `;
    }
    
    if (highYieldDistricts.length > 0) {
      briefing += `${highYieldDistricts.length} districts are showing excellent yield rates. `;
    }
    
    if (userPatterns.favoriteDistricts.length > 0) {
      const favorite = userPatterns.favoriteDistricts[0];
      const metrics = districtData.find(d => d.district === favorite);
      
      if (metrics) {
        briefing += `Your frequently checked district, ${favorite}, has ${metrics.breachCount} breaches today.`;
      }
    }
    
    proactiveAlert(briefing);
  };
  
  // Predict next breaches using simple heuristics
  const predictBreaches = () => {
    const predictions: string[] = [];
    
    districtData.forEach(district => {
      const history = breachHistoryRef.current.get(district.district) || [];
      
      if (history.length >= 3) {
        // Calculate trend
        const recentAvg = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const olderAvg = history.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        
        // If trend is increasing and approaching threshold
        if (recentAvg > olderAvg && recentAvg > 0.4 && recentAvg < 0.7) {
          predictions.push(district.district);
        }
      }
    });
    
    return predictions;
  };
  
  return { proactiveAlert, morningBriefing, predictBreaches };
}
