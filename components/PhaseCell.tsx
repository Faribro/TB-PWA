'use client';

import { calculatePatientPhase, getCompletedPhases } from '@/lib/phase-engine';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface PhaseCellProps {
  patient: any;
}

const PHASE_LABELS = ['Screening', 'Sputum', 'Diagnosis', 'ATT', 'Closed'];

export function PhaseCell({ patient }: PhaseCellProps) {
  const { phase, phaseIndex } = calculatePatientPhase(patient);
  const completedPhases = getCompletedPhases(patient);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map((index) => {
          const isCompleted = completedPhases.includes(index);
          const isCurrent = phaseIndex === index;
          
          return (
            <div key={index} className="relative group">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : isCurrent ? (
                <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {PHASE_LABELS[index]}
              </div>
            </div>
          );
        })}
      </div>
      <span className={`text-xs font-medium ${
        phase === 'Closed' ? 'text-gray-600' :
        phase === 'ATT Initiation' ? 'text-red-600' :
        phase === 'Diagnosis' ? 'text-amber-600' :
        phase === 'Sputum Test' ? 'text-blue-600' :
        'text-emerald-600'
      }`}>
        {phase}
      </span>
    </div>
  );
}
