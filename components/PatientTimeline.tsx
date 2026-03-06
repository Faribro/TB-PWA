'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Activity, Stethoscope, Pill, XCircle, Calendar } from 'lucide-react';
import { calculatePatientPhase, getCompletedPhases } from '@/lib/phase-engine';

interface PatientTimelineProps {
  patient: any;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date?: string;
  icon: any;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  color: string;
  bgColor: string;
  details?: string[];
}

export function PatientTimeline({ patient }: PatientTimelineProps) {
  const { phase, phaseIndex } = calculatePatientPhase(patient);
  const completedPhases = getCompletedPhases(patient);

  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      {
        id: 'screening',
        title: 'TB Screening',
        description: 'Initial screening for TB symptoms and risk factors',
        date: patient.screening_date,
        icon: Stethoscope,
        status: completedPhases.includes(0) ? 'completed' : phaseIndex === 0 ? 'current' : 'pending',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        details: patient.screening_date ? [
          `Facility: ${patient.facility_name}`,
          `X-ray: ${patient.xray_result || 'Pending'}`,
          `Symptoms: ${patient.symptoms_10s || 'None recorded'}`
        ] : []
      },
      {
        id: 'sputum',
        title: 'Sputum Collection',
        description: 'Referred for sputum examination and TB testing',
        date: patient.referral_date,
        icon: Activity,
        status: completedPhases.includes(1) ? 'completed' : phaseIndex === 1 ? 'current' : 'pending',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        details: patient.referral_date ? [
          `Referred to: ${patient.referral_facility || 'TB Diagnostic Centre'}`,
          `Date: ${patient.referral_date}`
        ] : []
      },
      {
        id: 'diagnosis',
        title: 'TB Diagnosis',
        description: 'Laboratory results and clinical diagnosis',
        date: patient.diagnosis_date,
        icon: AlertTriangle,
        status: !patient.referral_date ? 'pending' : // Cannot diagnose without sputum collection
                completedPhases.includes(2) ? 'completed' : 
                phaseIndex === 2 ? 'current' : 
                patient.tb_diagnosed === 'N' ? 'skipped' : 'pending',
        color: !patient.referral_date ? 'text-gray-400' :
               patient.tb_diagnosed === 'N' ? 'text-gray-600' : 'text-amber-600',
        bgColor: !patient.referral_date ? 'bg-gray-50' :
                 patient.tb_diagnosed === 'N' ? 'bg-gray-50' : 'bg-amber-50',
        details: !patient.referral_date ? ['Requires sputum collection first'] :
                 patient.tb_diagnosed ? [
                   `Result: ${patient.tb_diagnosed === 'Y' ? 'TB Positive' : 'Not TB'}`,
                   patient.tb_type ? `Type: ${patient.tb_type === 'P' ? 'Pulmonary' : 'Extra-Pulmonary'}` : '',
                   patient.diagnosis_date ? `Date: ${patient.diagnosis_date}` : ''
                 ].filter(Boolean) : ['Awaiting laboratory results']
      }
    ];

    // Add ATT Initiation only if TB positive
    if (patient.tb_diagnosed === 'Y' || phaseIndex >= 3) {
      events.push({
        id: 'att_start',
        title: 'ATT Initiation',
        description: 'Anti-TB treatment started',
        date: patient.att_start_date,
        icon: Pill,
        status: completedPhases.includes(3) ? 'completed' : phaseIndex === 3 ? 'current' : 'pending',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        details: patient.att_start_date ? [
          `Treatment started: ${patient.att_start_date}`,
          patient.hiv_status ? `HIV Status: ${patient.hiv_status}` : '',
          patient.nikshay_id ? `NIKSHAY ID: ${patient.nikshay_id}` : ''
        ].filter(Boolean) : []
      });
    }

    // Add completion/closure
    events.push({
      id: 'completion',
      title: patient.tb_diagnosed === 'N' ? 'Case Closed' : 'Treatment Complete',
      description: patient.tb_diagnosed === 'N' ? 'Patient cleared - Not TB' : 'ATT treatment completed successfully',
      date: patient.att_completion_date || (patient.tb_diagnosed === 'N' ? patient.diagnosis_date : undefined),
      icon: patient.tb_diagnosed === 'N' ? XCircle : CheckCircle2,
      status: completedPhases.includes(4) ? 'completed' : 'pending',
      color: patient.tb_diagnosed === 'N' ? 'text-gray-600' : 'text-green-600',
      bgColor: patient.tb_diagnosed === 'N' ? 'bg-gray-50' : 'bg-green-50',
      details: patient.att_completion_date ? [
        `Completed: ${patient.att_completion_date}`,
        patient.att_start_date ? `Duration: ${Math.ceil((new Date(patient.att_completion_date).getTime() - new Date(patient.att_start_date).getTime()) / (1000 * 60 * 60 * 24))} days` : ''
      ].filter(Boolean) : patient.tb_diagnosed === 'N' ? ['Case closed - Not TB'] : []
    });

    return events;
  };

  const events = getTimelineEvents();

  const getStatusIcon = (event: TimelineEvent) => {
    const IconComponent = event.icon;
    
    switch (event.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-white" />;
      case 'current':
        return <Clock className="w-5 h-5 text-white animate-pulse" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-white" />;
      default:
        return <IconComponent className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusStyles = (event: TimelineEvent) => {
    switch (event.status) {
      case 'completed':
        return 'bg-emerald-500 border-emerald-500';
      case 'current':
        return 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30';
      case 'skipped':
        return 'bg-gray-400 border-gray-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  return (
    <div className="relative">
      {/* Timeline Header */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Patient Journey Timeline</h3>
        <p className="text-sm text-slate-600">Track progress through TB care pathway</p>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-200 via-blue-200 to-purple-200"></div>

        {/* Timeline Events */}
        <div className="space-y-8">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start"
            >
              {/* Timeline Dot */}
              <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 ${getStatusStyles(event)} transition-all duration-300`}>
                {getStatusIcon(event)}
              </div>

              {/* Content Card */}
              <div className={`ml-6 flex-1 ${event.bgColor} rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className={`font-semibold ${event.color} text-lg`}>{event.title}</h4>
                    <p className="text-slate-600 text-sm mt-1">{event.description}</p>
                  </div>
                  {event.date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 bg-white/70 px-2 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {event.date}
                    </div>
                  )}
                </div>

                {/* Event Details */}
                {event.details && event.details.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {event.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                        {detail}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    event.status === 'current' ? 'bg-blue-100 text-blue-700' :
                    event.status === 'skipped' ? 'bg-gray-100 text-gray-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {event.status === 'completed' ? 'Completed' :
                     event.status === 'current' ? 'In Progress' :
                     event.status === 'skipped' ? 'Not Required' :
                     'Pending'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Timeline Footer */}
      <div className="mt-8 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-slate-600">Journey Progress</span>
          </div>
          <div className="font-semibold text-slate-900">
            {Math.round((completedPhases.length / events.length) * 100)}% Complete
          </div>
        </div>
      </div>
    </div>
  );
}