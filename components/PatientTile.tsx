'use client';

import { motion } from 'framer-motion';
import { Activity, Beaker, CheckCircle2, ChevronRight, Heart, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, memo } from 'react';
import { calculatePatientPhase } from '@/lib/phase-engine';

interface PatientTileProps {
  patient: any;
  onClick: () => void;
  index?: number;
}

const PHASE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  'Screening':      { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-500/20' },
  'Sputum Test':    { bg: 'bg-blue-500/10',     text: 'text-blue-600',    border: 'border-blue-500/20' },
  'Diagnosis':      { bg: 'bg-purple-500/10',   text: 'text-purple-600',  border: 'border-purple-500/20' },
  'ATT Initiation': { bg: 'bg-emerald-500/10',  text: 'text-emerald-600', border: 'border-emerald-500/20' },
  'Closed':         { bg: 'bg-slate-500/10',    text: 'text-slate-500',   border: 'border-slate-500/20' },
};

export const PatientTile = memo(function PatientTile({ patient, onClick }: PatientTileProps) {
  const isHighRisk = patient.genki_score > 0.8;
  const isLinked = patient.link_status === 'LINKED';
  const [isDragOver, setIsDragOver] = useState(false);
  const { phase } = calculatePatientPhase(patient);
  const phaseStyle = PHASE_BADGE[phase] || PHASE_BADGE['Screening'];

  // Days since screening
  const daysSince = patient.screening_date
    ? Math.floor((Date.now() - new Date(patient.screening_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isOverdue = daysSince > 30 && !phase.includes('Closed');

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('patientId', patient.id ?? patient.unique_id ?? '');
    e.dataTransfer.effectAllowed = 'link';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
    >
    <motion.button
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col p-6 bg-white/80 backdrop-blur-xl border-2 rounded-3xl text-left transition-all duration-300",
        "shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(59,130,246,0.08)]",
        isDragOver ? "scale-105 border-dashed border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.3)]" : "border-white/60 hover:border-blue-200/60",
        isHighRisk && "ring-2 ring-red-500/15",
        isOverdue && "ring-1 ring-amber-400/30"
      )}
    >
      {/* Top Row: Phase Badge + Status Indicators */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "px-3 py-1.5 rounded-xl flex items-center gap-2 border",
          phaseStyle.bg, phaseStyle.text, phaseStyle.border
        )}>
          {isOverdue ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <span className={cn("w-1.5 h-1.5 rounded-full", isHighRisk ? "bg-red-500 animate-pulse" : "bg-current opacity-60")} />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest">{phase}</span>
        </div>

        <div className="flex items-center gap-2">
          {isLinked && (
            <div className="p-1.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {isHighRisk && (
            <div className="relative w-4 h-4">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
              <span className="absolute inset-0 rounded-full bg-red-600" />
            </div>
          )}
        </div>
      </div>

      {/* Name + ID */}
      <div className="mb-5">
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-0.5 truncate" style={{ fontFamily: 'var(--font-outfit)' }}>
          {patient.inmate_name}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          ID: {patient.unique_id}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Genki Score</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black text-slate-800">{patient.genki_score?.toFixed(2) || '0.00'}</p>
              <Heart className="w-3 h-3 text-red-400 fill-red-400 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <Beaker className="w-4 h-4 text-purple-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Primary Scan</p>
            <p className="text-xs font-bold text-slate-700 truncate">{patient.primary_scan || 'Chest X-Ray Digital'}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-slate-300" />
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider",
            isOverdue ? "text-amber-500" : "text-slate-400"
          )}>
            {daysSince}d since screening
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:shadow-lg group-hover:shadow-blue-500/20">
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
        </div>
      </div>
    </motion.button>
    </div>
  );
});
