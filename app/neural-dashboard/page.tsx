'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { TreeFilterProvider } from '@/contexts/TreeFilterContext';
import MindMapDashboard from '@/components/MindMapDashboard';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useRealtimePatients } from '@/lib/useRealtimePatients';

export default function NeuralDashboardPage() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const { patients: patients = [], isLoading, mutate: mutatePatients } = useSWRAllPatients(null);
  const { mutate } = useSWRConfig();
  
  // Realtime updates with optimistic UI
  useRealtimePatients({
    onInsert: (newPatient) => {
      mutatePatients((current: any) => {
        if (!current) return current;
        return {
          ...current,
          data: [newPatient, ...current.data]
        };
      }, false); // false = don't revalidate
    },
    onUpdate: (updatedPatient) => {
      mutatePatients((current: any) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((p: any) => 
            p.id === updatedPatient.id ? updatedPatient : p
          )
        };
      }, false);
    }
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white text-xl">Loading neural network...</div>
      </div>
    );
  }

  return (
    <TreeFilterProvider>
      <div className="h-screen flex bg-slate-950">
        <div className="flex-1 overflow-y-auto">
          <MindMapDashboard patients={patients} />
        </div>

        <div className="w-2/5 border-l border-white/5">
          <FollowUpPipeline 
            patients={patients}
            onPatientClick={setSelectedPatient}
          />
        </div>
      </div>

      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdate={() => mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'))}
        />
      )}
    </TreeFilterProvider>
  );
}
