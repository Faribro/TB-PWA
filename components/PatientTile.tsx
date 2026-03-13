'use client';

import { motion } from 'framer-motion';
import { MapPin, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  facility_name?: string;
  screening_district?: string;
  screening_date?: string;
  submitted_on?: string;
  referral_date?: string | null;
  tb_diagnosed?: string | null;
  current_phase?: string;
  coordinator_name?: string;
  assigned_to?: string;
  staff_name?: string;
}

interface PatientTileProps {
  patient: Patient;
  onClick: () => void;
  index: number;
}

export function PatientTile({ patient, onClick, index }: PatientTileProps) {
  const submittedDate = patient.submitted_on || patient.screening_date;
  const daysSince = submittedDate 
    ? Math.floor((Date.now() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const daysRemaining = 7 - daysSince;
  const isBreached = daysSince > 7;
  const phase = (patient.current_phase || '').toLowerCase();
  const isActive = !phase.includes('treatment') && !phase.includes('closed');

  const steps = [
    { label: 'Screened', completed: !!patient.screening_date },
    { label: 'Sputum', completed: !!patient.referral_date },
    { label: 'Diagnosed', completed: patient.tb_diagnosed === 'Y' || patient.tb_diagnosed === 'Yes' }
  ];

  const currentStepIndex = steps.findIndex(s => !s.completed);
  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 30 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border p-5 cursor-pointer transition-all duration-300 overflow-hidden ${
        isBreached && isActive 
          ? 'border-red-200 shadow-lg shadow-red-100/50 hover:shadow-xl hover:shadow-red-200/50' 
          : 'border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50'
      }`}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Progress Bar Background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: index * 0.02 + 0.2 }}
          className={`h-full ${
            progress === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
            progress >= 66 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
            'bg-gradient-to-r from-amber-400 to-amber-500'
          }`}
        />
      </div>

      {/* Header */}
      <div className="relative mb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg mb-0.5 group-hover:text-blue-600 transition-colors">
              {patient.inmate_name}
            </h3>
            <p className="text-xs text-slate-400 font-mono tracking-wide">{patient.unique_id}</p>
          </div>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.02 + 0.3, type: 'spring' }}
            >
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Mini-Cascade Timeline */}
      <div className="relative mb-4">
        <div className="flex items-center gap-1.5">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1 gap-1.5">
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.02 + idx * 0.1 }}
                  className={`w-full h-2 rounded-full transition-all duration-300 ${
                    step.completed 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-200' 
                      : currentStepIndex === idx 
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm shadow-blue-200 animate-pulse' 
                      : 'bg-slate-100'
                  }`}
                />
                <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                  step.completed 
                    ? 'text-emerald-600' 
                    : currentStepIndex === idx 
                    ? 'text-blue-600' 
                    : 'text-slate-300'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="w-1 h-0.5 bg-slate-100 mx-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 group-hover:text-slate-700 transition-colors">
        <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
        <span className="font-medium truncate text-xs">{patient.facility_name || patient.screening_district}</span>
      </div>

      {/* SLA Countdown Badge */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 + 0.4 }}
          className="mb-4"
        >
          {isBreached ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">Overdue</p>
                <p className="text-sm font-bold text-red-700">{daysSince - 7} Day{daysSince - 7 > 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : daysRemaining <= 2 ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">Urgent</p>
                <p className="text-sm font-bold text-amber-700">{daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Left</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">On Track</p>
                <p className="text-sm font-bold text-emerald-700">{daysRemaining} Days</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Staff Attribution */}
      <div className="relative pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Coordinator
          </p>
          <p className="text-xs text-slate-600 font-medium">
            {patient.coordinator_name || patient.assigned_to || patient.staff_name || 'Unassigned'}
          </p>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
    </motion.div>
  );
}
