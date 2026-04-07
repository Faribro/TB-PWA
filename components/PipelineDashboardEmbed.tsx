'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { LinesAndDotsLoader } from './LinesAndDotsLoader';

export default function PipelineDashboardEmbed() {
  const scope = useSessionScope();
  const { data: globalPatients = [], isLoading } = useSWRAllPatients(scope);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [progress, setProgress] = useState(0);

  const stats = useMemo(() => {
    if (!globalPatients || globalPatients.length === 0) {
      return {
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
      };
    }

    const screened = globalPatients.length;
    const suspected = globalPatients.filter(p => {
      const xray = (p.chest_x_ray_result || p.xray_result || '').toLowerCase();
      return xray.includes('suspected') || xray.includes('abnormal') || xray === 's';
    }).length;
    const referred = globalPatients.filter(p => p.referral_date).length;
    const confirmed = globalPatients.filter(p => p.tb_diagnosed === 'Y').length;
    const initiated = globalPatients.filter(p => p.att_start_date).length;
    const completed = globalPatients.filter(p => p.att_completion_date).length;
    const hivPositive = globalPatients.filter(p => (p.hiv_status || '').toLowerCase() === 'positive').length;
    const ltfu = globalPatients.filter(p => {
      if (!p.att_start_date || p.att_completion_date) return false;
      const daysSince = (Date.now() - new Date(p.att_start_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    }).length;

    return {
      kpis: [
        { label: 'SCREENED', value: screened, color: 'cyan' },
        { label: 'SUSPECTED', value: suspected, color: 'amber' },
        { label: 'REFERRED', value: referred, color: 'indigo' },
        { label: 'CONFIRMED', value: confirmed, color: 'emerald' },
        { label: 'INITIATED', value: initiated, color: 'green' },
        { label: 'COMPLETED', value: completed, color: 'teal' },
        { label: 'HIV+', value: hivPositive, color: 'rose' },
        { label: 'LTFU', value: ltfu, color: 'orange' }
      ]
    };
  }, [globalPatients]);

  const chunks = [stats.kpis.slice(0, 4), stats.kpis.slice(4, 8)];

  useEffect(() => {
    const interval = setInterval(() => setCurrentChunk(p => (p + 1) % 2), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isLoading]);

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

  if (isLoading && globalPatients.length === 0) {
    return (
      <div style={{ width: '100%', padding: 0 }}>
        <div className="flex items-center justify-center py-20">
          <LinesAndDotsLoader progress={progress} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: 0 }}>
      <div className="relative px-20 py-2">
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setCurrentChunk(p => (p - 1 + 2) % 2)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 shadow-lg flex items-center justify-center z-20 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentChunk(p => (p + 1) % 2)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-100 shadow-lg flex items-center justify-center z-20 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          {chunks[currentChunk].map((kpi, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 bg-slate-900/95 border border-slate-700 transition-all hover:border-slate-600 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl font-black text-white">
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
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
