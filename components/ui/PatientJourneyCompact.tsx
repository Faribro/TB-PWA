'use client';

import { Search, AlertCircle, ArrowRightCircle, Activity, Pill, ClipboardList, CheckCircle2 } from 'lucide-react';

interface Milestone {
  id: string;
  label: string;
  sublabel: string | null;
  icon: React.ReactNode;
  isComplete: boolean;
  isActive: boolean;
}

interface PatientJourneyCompactProps {
  patient: any;
}

export function PatientJourneyCompact({ patient }: PatientJourneyCompactProps) {
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const milestones: Milestone[] = [
    { id: 'screened', label: 'Screened', sublabel: fmtDate(patient?.screening_date), icon: <Search className="w-3 h-3" />, isComplete: Boolean(patient?.screening_date), isActive: false },
    { id: 'xray', label: 'X-Ray', sublabel: patient?.xray_result || patient?.chest_x_ray_result || null, icon: <AlertCircle className="w-3 h-3" />, isComplete: Boolean(patient?.xray_result || patient?.chest_x_ray_result), isActive: false },
    { id: 'referred', label: 'Sputum', sublabel: fmtDate(patient?.referral_date) || 'Pending', icon: <ArrowRightCircle className="w-3 h-3" />, isComplete: Boolean(patient?.referral_date), isActive: !patient?.referral_date },
    { id: 'diagnosed', label: 'Diagnosed', sublabel: patient?.tb_diagnosed === 'Y' ? (fmtDate(patient?.date_of_tb_diagnosed) || 'Confirmed') : patient?.tb_diagnosed === 'N' ? 'Not Confirmed' : 'Pending', icon: <Activity className="w-3 h-3" />, isComplete: Boolean(patient?.tb_diagnosed), isActive: Boolean(patient?.referral_date) && !patient?.tb_diagnosed },
    { id: 'treatment', label: 'ATT', sublabel: fmtDate(patient?.att_start_date) || 'Pending', icon: <Pill className="w-3 h-3" />, isComplete: Boolean(patient?.att_start_date), isActive: Boolean(patient?.tb_diagnosed) && !patient?.att_start_date },
    { id: 'nikshay', label: 'Nikshay', sublabel: patient?.nikshay_id || 'Pending', icon: <ClipboardList className="w-3 h-3" />, isComplete: Boolean(patient?.nikshay_id), isActive: Boolean(patient?.att_start_date) && !patient?.nikshay_id },
    { id: 'completed', label: 'Complete', sublabel: fmtDate(patient?.att_completion_date) || 'Ongoing', icon: <CheckCircle2 className="w-3 h-3" />, isComplete: Boolean(patient?.att_completion_date), isActive: false },
  ];

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Journey</span>
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg px-2 py-1.5 border border-slate-300">
        {milestones.map((m, idx) => (
          <div key={m.id} className="flex items-center gap-0.5">
            {/* Milestone dot */}
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                m.isComplete 
                  ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]' 
                  : m.isActive 
                    ? 'bg-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.2)] animate-pulse' 
                    : 'bg-slate-300 border border-slate-400'
              }`}
              title={`${m.label}: ${m.sublabel || 'Pending'}`}
            >
              <span className={m.isComplete || m.isActive ? 'text-white' : 'text-slate-500'}>{m.icon}</span>
            </div>

            {/* Connector line */}
            {idx < milestones.length - 1 && (
              <div
                className={`w-2.5 h-0.5 rounded-full flex-shrink-0 ${
                  m.isComplete ? 'bg-emerald-400' : 'bg-slate-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
