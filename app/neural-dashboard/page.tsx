'use client';

import { useState } from 'react';
import { TreeFilterProvider } from '@/contexts/TreeFilterContext';
import MindMapDashboard from '@/components/MindMapDashboard';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';

export default function NeuralDashboardPage() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const { data: patients = [], isLoading } = useSWRAllPatients();

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
          onUpdate={() => {}}
        />
      )}
    </TreeFilterProvider>
  );
}
