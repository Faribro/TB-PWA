'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, Activity, CheckCircle, User, MapPin } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  screening_state: string;
  screening_district: string;
  facility_name: string;
  screening_date: string;
  xray_result: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date: string | null;
  age: number;
  sex: string;
  symptoms_10s: string;
  tb_past_history: string;
  created_at: string;
}

const calculateRiskScore = (patient: Patient): number => {
  let score = 0;
  if (patient.xray_result?.includes('Suspeced_TB_Case')) score += 30;
  if (patient.symptoms_10s?.includes('Cough')) score += 20;
  if (patient.tb_past_history === 'Yes') score += 25;
  if (patient.age > 60) score += 15;
  return Math.min(score, 100);
};

const isOverdue = (date: string): boolean => {
  const diffHours = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
  return diffHours > 48;
};

const phases = [
  {
    id: 'referral',
    title: 'Phase A: Referral Due',
    icon: AlertTriangle,
    gradient: 'from-amber-400 to-orange-500',
    filter: (p: Patient) => p.xray_result?.includes('Suspeced_TB_Case') && !p.referral_date
  },
  {
    id: 'diagnosis',
    title: 'Phase B: Diagnosis Pending',
    icon: Activity,
    gradient: 'from-blue-400 to-indigo-500',
    filter: (p: Patient) => p.referral_date && !p.tb_diagnosed
  },
  {
    id: 'att_start',
    title: 'Phase C: ATT Start Due',
    icon: Calendar,
    gradient: 'from-emerald-400 to-teal-500',
    filter: (p: Patient) => p.tb_diagnosed === 'Yes' && !p.att_start_date
  },
  {
    id: 'monitoring',
    title: 'Phase D: Monitoring',
    icon: CheckCircle,
    gradient: 'from-purple-400 to-violet-500',
    filter: (p: Patient) => p.att_start_date && !p.att_completion_date
  }
];

export default function KanbanDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .limit(1000);
    
    if (data) {
      startTransition(() => {
        setPatients(data);
        setLoading(false);
      });
    }
  };

  const PatientCard = ({ patient, index }: { patient: Patient; index: number }) => {
    const riskScore = calculateRiskScore(patient);
    const isHighRisk = riskScore > 70;
    const overdueStatus = isOverdue(patient.screening_date);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`
          relative bg-white rounded-xl border-2 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200
          ${isHighRisk ? 'border-red-300 animate-pulse' : overdueStatus ? 'border-amber-300' : 'border-gray-200'}
        `}
      >
        {(isHighRisk || overdueStatus) && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
              isHighRisk ? 'bg-red-500' : 'bg-amber-500'
            }`}
          />
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 text-sm">
              {patient.inmate_name}
            </span>
          </div>
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${isHighRisk ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
          `}>
            Risk: {riskScore}
          </div>
        </div>
        
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {patient.unique_id}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{patient.facility_name}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Screened: {new Date(patient.screening_date).toLocaleDateString()}</span>
          </div>
          
          <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            {patient.xray_result}
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="text-gray-500">{patient.age}y, {patient.sex}</span>
            <span className="text-gray-500">{patient.screening_district}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">TB Follow-up Pipeline</h1>
            <p className="text-gray-600 text-sm">Clinical Task Management Dashboard</p>
          </div>
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-emerald-700 text-sm font-medium">Live</span>
          </motion.div>
        </div>
      </motion.header>

      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {phases.map((phase, phaseIndex) => {
              const phasePatients = patients.filter(phase.filter);
              const Icon = phase.icon;
              
              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: phaseIndex * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg"
                >
                  <div className={`bg-gradient-to-r ${phase.gradient} text-white p-4`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <h3 className="font-semibold text-sm">{phase.title}</h3>
                        <p className="text-xs opacity-90">{phasePatients.length} patients</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <AnimatePresence>
                      {phasePatients.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8 text-gray-500"
                        >
                          <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No patients in this phase</p>
                        </motion.div>
                      ) : (
                        phasePatients.map((patient, index) => (
                          <PatientCard key={patient.id} patient={patient} index={index} />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}