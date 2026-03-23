'use client';

import { Activity, AlertCircle, ChevronRight, FileText, Image as ImageIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NexusPatientRowProps {
  patient: any;
  onClick: () => void;
}

export function NexusPatientRow({ patient, onClick }: NexusPatientRowProps) {
  const riskScore = patient.genki_score ?? 0;
  const isHighRisk = riskScore > 0.8;
  const isMediumRisk = riskScore > 0.4 && riskScore <= 0.8;

  // Mock symptoms for visual "Medical Grade" density
  const symptoms = patient.symptoms || (isHighRisk ? ['Cough', 'Fever', 'Dyspnea'] : ['Asymptomatic']);

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[1fr_100px_150px_120px_100px] gap-4 px-8 py-4 items-center hover:bg-blue-50/30 transition-all group border-l-4 border-l-transparent hover:border-l-blue-600"
    >
      {/* Patient / Identity */}
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-mono text-xs font-black",
          isHighRisk ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
        )}>
          {patient.inmate_name?.slice(0, 1) || 'P'}
        </div>
        <div className="text-left min-w-0">
          <p className="text-sm font-black text-slate-900 truncate leading-none mb-1 group-hover:text-blue-600 transition-colors">
            {patient.inmate_name}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
              ID: {patient.unique_id}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
              <MapPin className="w-3 h-3" />
              {patient.unit || 'A-Block'}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Index */}
      <div className="flex flex-col items-center justify-center">
        <div className={cn(
          "text-sm font-mono font-black",
          isHighRisk ? "text-red-600" : isMediumRisk ? "text-amber-600" : "text-emerald-600"
        )}>
          {Math.round(riskScore * 100)}
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              isHighRisk ? "bg-red-500" : isMediumRisk ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${riskScore * 100}%` }}
          />
        </div>
      </div>

      {/* Symptoms Icons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {symptoms.map((s: string, i: number) => (
          <span 
            key={i}
            className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase tracking-widest border border-slate-200/50"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Latest Scan Thumbnail / Icon */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative group-hover:scale-105 transition-transform">
           {/* If we had a thumbnail, we'd put it here. Using icon for now. */}
           <ImageIcon className="w-4 h-4 text-white/40" />
           <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">X-RAY</p>
          <p className="text-[10px] font-bold text-slate-600">2h ago</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-end">
        <div className={cn(
          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
          patient.link_status === 'LINKED' 
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
            : "bg-blue-50 text-blue-700 border border-blue-100"
        )}>
          {patient.link_status === 'LINKED' ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready
            </>
          ) : (
            <>
              <Activity className="w-3 h-3 animate-pulse" />
              Pending
            </>
          )}
          <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}

