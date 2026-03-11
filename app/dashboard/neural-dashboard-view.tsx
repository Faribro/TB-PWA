'use client';

import { useState, useEffect, memo } from 'react';
import MindMapDashboard from '@/components/MindMapDashboard';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';
import { LinesAndDotsLoader } from '@/components/LinesAndDotsLoader';

interface NeuralDashboardViewProps {
  globalPatients?: any[];
  isLoading?: boolean;
}

const NeuralDashboardView = memo(function NeuralDashboardView({ globalPatients = [], isLoading = false }: NeuralDashboardViewProps) {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 99));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <LinesAndDotsLoader progress={99} />
      </div>
    );
  }

  if (!globalPatients || globalPatients.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="text-slate-400 text-lg font-bold mb-2">No patients found</div>
          <div className="text-slate-500 text-sm font-medium">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="flex-1 overflow-y-auto">
        <MindMapDashboard patients={globalPatients} />
      </div>

      <div className="w-2/5 border-l border-slate-200/60">
        <FollowUpPipeline 
          globalPatients={globalPatients}
          isLoading={isLoading}
          onPatientClick={setSelectedPatient}
        />
      </div>

      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  );
});

export default NeuralDashboardView;
