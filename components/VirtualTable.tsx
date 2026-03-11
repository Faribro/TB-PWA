'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { PhaseCell } from './PhaseCell';
import { calculatePatientPhase } from '@/lib/phase-engine';

interface VirtualTableProps {
  patients: any[];
  onPatientClick: (patient: any) => void;
  selectedPatientId?: number;
  triageIds: number[];
  onTriageToggle: (id: number) => void;
  canSelectForTriage: (patient: any) => boolean;
  getPhase: (patient: any) => number;
  getDaysInPhase: (patient: any) => number;
  isOverdue: (patient: any) => boolean;
}

export function VirtualTable({
  patients,
  onPatientClick,
  selectedPatientId,
  triageIds,
  onTriageToggle,
  canSelectForTriage,
  getPhase,
  getDaysInPhase,
  isOverdue,
}: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: patients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const patient = patients[virtualRow.index];
          const phase = getPhase(patient);
          const days = getDaysInPhase(patient);
          const overdue = isOverdue(patient);
          const canSelect = canSelectForTriage(patient);

          return (
            <div
              key={patient.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                onClick={() => onPatientClick(patient)}
                className={`flex items-center px-4 py-3 border-b border-slate-100 cursor-pointer transition-all hover:bg-blue-50 ${
                  selectedPatientId === patient.id ? 'bg-blue-50' : ''
                } ${overdue ? 'bg-red-50' : ''}`}
              >
                <div className="w-12">
                  <input
                    type="checkbox"
                    checked={triageIds.includes(patient.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onTriageToggle(patient.id);
                    }}
                    disabled={!canSelect}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  {overdue && <Clock className="w-4 h-4 text-red-500" />}
                  <div>
                    <div className="font-semibold text-slate-900">{patient.inmate_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{patient.unique_id}</div>
                  </div>
                </div>
                <div className="w-32 text-sm text-slate-600">{patient.screening_state}</div>
                <div className="w-32 text-sm text-slate-600">{patient.screening_district}</div>
                <div className="w-48 text-sm text-slate-600">{patient.facility_name}</div>
                <div className="w-24 text-sm text-slate-600">
                  {patient.screening_date ? (() => {
                    const date = new Date(patient.screening_date);
                    const dd = String(date.getDate()).padStart(2, '0');
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const yy = String(date.getFullYear()).slice(-2);
                    return `${dd}/${mm}/${yy}`;
                  })() : '-'}
                </div>
                <div className="w-32">
                  <PhaseCell patient={patient} />
                </div>
                <div className="w-16">
                  <span className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>{days}d</span>
                </div>
                <div className="w-32">
                  {(() => {
                    const { phase } = calculatePatientPhase(patient);
                    const statusConfig = {
                      'Screening': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Screening' },
                      'Sputum Test': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Awaiting Sputum' },
                      'Diagnosis': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Pending Diagnosis' },
                      'ATT Initiation': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Starting ATT' },
                      'Closed': { bg: 'bg-gray-100', text: 'text-gray-700', label: patient.tb_diagnosed === 'Y' ? 'Completed' : 'Not TB' }
                    };
                    const config = statusConfig[phase as keyof typeof statusConfig];
                    return (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
