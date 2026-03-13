'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Activity, AlertTriangle, Pill } from 'lucide-react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { PatientDetailDrawer } from './PatientDetailDrawer';

export default function ActionsHub() {
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const userRole = 'National Admin';
  const userState = undefined;
  const { data: allPatients = [] } = useSWRAllPatients(userState);

  const filteredData = useMemo(() => {
    const state = activeState || userState;
    return state ? allPatients.filter((p: any) => p.screening_state === state) : allPatients;
  }, [allPatients, userState, activeState]);

  const getDaysPending = (patient: any): number => {
    const date = patient.submitted_on || patient.screening_date;
    if (!date) return 0;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  const columns = useMemo(() => {
    const now = Date.now();
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

    const newScreenings = filteredData.filter((p: any) => {
      const screeningDate = new Date(p.screening_date || p.submitted_on).getTime();
      return screeningDate >= fortyEightHoursAgo && !p.sputum_date && !p.referral_date;
    });

    const awaitingDiagnosis = filteredData.filter((p: any) => {
      return p.sputum_date && !p.tb_diagnosed;
    });

    const criticalDelays = filteredData.filter((p: any) => {
      const days = getDaysPending(p);
      const phase = (p.current_phase || '').toLowerCase();
      return days > 7 && !phase.includes('treatment') && !phase.includes('closed');
    });

    const readyForTreatment = filteredData.filter((p: any) => {
      return p.tb_diagnosed === 'Yes' && !p.att_start_date;
    });

    return { newScreenings, awaitingDiagnosis, criticalDelays, readyForTreatment };
  }, [filteredData]);

  const states = useMemo(() => {
    const unique = new Set(allPatients.map((p: any) => p.screening_state).filter(Boolean));
    return Array.from(unique).sort();
  }, [allPatients]);

  const PatientCard = ({ patient, isCritical }: { patient: any; isCritical?: boolean }) => {
    const days = getDaysPending(patient);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setSelectedPatient(patient)}
        className={`p-3 bg-white rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
          isCritical ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{patient.inmate_name}</div>
            <div className="text-xs text-slate-500 font-mono">{patient.unique_id}</div>
          </div>
          <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        </div>
        <div className="text-xs text-slate-600 truncate">{patient.facility_name}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">{days}d ago</span>
          <span className="text-xs text-slate-500">{patient.screening_district}</span>
        </div>
      </motion.div>
    );
  };

  const Column = ({ title, icon: Icon, count, patients, color, isCritical }: any) => {
    return (
      <div className="flex-1 min-w-[280px]">
        <div className="mb-4 flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-600`} />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{title}</h3>
          <span className={`ml-auto px-2.5 py-1 bg-${color}-100 text-${color}-700 text-xs font-semibold rounded-full`}>
            {count}
          </span>
        </div>
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {patients.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500">No patients</p>
            </div>
          ) : (
            patients.map((patient: any) => (
              <PatientCard key={patient.id} patient={patient} isCritical={isCritical} />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="h-full overflow-hidden bg-slate-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">
              {userRole === 'National Admin' ? 'All States' : userState || 'Dashboard'}
            </span>
          </div>
          {userRole === 'National Admin' && (
            <select
              value={activeState || ''}
              onChange={(e) => setActiveState(e.target.value || null)}
              className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">All States</option>
              {states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          <Column
            title="New Screenings"
            icon={Stethoscope}
            count={columns.newScreenings.length}
            patients={columns.newScreenings}
            color="blue"
          />
          <Column
            title="Awaiting Diagnosis"
            icon={Activity}
            count={columns.awaitingDiagnosis.length}
            patients={columns.awaitingDiagnosis}
            color="amber"
          />
          <Column
            title="Critical Delays"
            icon={AlertTriangle}
            count={columns.criticalDelays.length}
            patients={columns.criticalDelays}
            color="red"
            isCritical
          />
          <Column
            title="Ready for Treatment"
            icon={Pill}
            count={columns.readyForTreatment.length}
            patients={columns.readyForTreatment}
            color="green"
          />
        </div>
      </div>

      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen={true}
          onClose={() => setSelectedPatient(null)}
          onUpdate={() => {}}
        />
      )}
    </>
  );
}
