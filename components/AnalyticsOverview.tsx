'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LinesAndDotsLoader } from './LinesAndDotsLoader';

interface AnalyticsProps {
  patients: any[];
  totalCount: number;
  isSLABreach: (p: any) => boolean;
}

export default function AnalyticsOverview({ patients, totalCount, isSLABreach }: AnalyticsProps) {
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    kpis: [
      { label: 'SCREENED', value: 0, color: 'cyan' },
      { label: 'SUSPECTED', value: 0, color: 'amber' },
      { label: 'REFERRED', value: 0, color: 'indigo' },
      { label: 'CONFIRMED', value: 0, color: 'emerald' },
      { label: 'INITIATED', value: 0, color: 'green' },
      { label: 'COMPLETED', value: 0, color: 'teal' },
      { label: 'HIV+', value: 0, color: 'rose' },
      { label: 'LTFU', value: 0, color: 'orange' }
    ]
  });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Worker) {
      workerRef.current = new Worker('/analytics.worker.js');
      workerRef.current.onmessage = (e) => {
        setStats(e.data);
        setIsLoading(false);
      };
      return () => workerRef.current?.terminate();
    }
  }, []);

  useEffect(() => {
    if (workerRef.current && patients.length > 0) {
      setIsLoading(true);
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 100);
      workerRef.current.postMessage({ patients, totalCount });
      return () => clearInterval(interval);
    }
  }, [patients, totalCount]);

  const chunks = [stats.kpis.slice(0, 4), stats.kpis.slice(4, 8)];

  useEffect(() => {
    const interval = setInterval(() => setCurrentChunk(p => (p + 1) % 2), 10000);
    return () => clearInterval(interval);
  }, []);

  const colors: Record<string, string> = {
    cyan: '#22d3ee',
    amber: '#fbbf24',
    indigo: '#6366f1',
    emerald: '#10b981',
    green: '#22c55e',
    teal: '#14b8a6',
    rose: '#f43f5e',
    orange: '#f97316'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LinesAndDotsLoader progress={progress} />
      </div>
    );
  }

  return (
    <div className="relative px-20 py-2">
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setCurrentChunk(p => (p - 1 + 2) % 2)}
          className="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 shadow-lg flex items-center justify-center z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentChunk(p => (p + 1) % 2)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 shadow-lg flex items-center justify-center z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        {chunks[currentChunk].map((kpi, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 bg-slate-900/95 border border-slate-700"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-5xl font-black text-white">
                {kpi.value.toLocaleString()}
              </div>
            </div>
            <div className="text-xs uppercase tracking-widest font-bold" style={{ color: colors[kpi.color] }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center gap-2 mt-4">
        {[0, 1].map((idx) => (
          <button
            key={idx}
            onClick={() => setCurrentChunk(idx)}
            className={`h-1.5 rounded-full transition-all ${
              currentChunk === idx ? 'w-8 bg-cyan-400' : 'w-1.5 bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
