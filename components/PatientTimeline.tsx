'use client';

import { motion } from 'framer-motion';
import { Activity, User, MapPin } from 'lucide-react';

interface PatientTimelineProps {
  patient: any;
}

interface MedicalEvent {
  id: string;
  action: string;
  staff: string;
  location: string;
  date: string;
}

export function PatientTimeline({ patient }: PatientTimelineProps) {
  const getEvents = (): MedicalEvent[] => {
    const events: MedicalEvent[] = [];

    if (patient.screening_date) {
      events.push({
        id: '1',
        action: `Initial screening completed - X-ray: ${patient.xray_result || 'Pending'}`,
        staff: patient.staff_name || 'Medical Staff',
        location: patient.facility_name || 'Unknown',
        date: patient.screening_date
      });
    }

    if (patient.referral_date) {
      events.push({
        id: '2',
        action: `Referred for sputum examination to ${patient.referral_facility || 'TB Centre'}`,
        staff: patient.staff_name || 'Medical Staff',
        location: patient.facility_name || 'Unknown',
        date: patient.referral_date
      });
    }

    if (patient.diagnosis_date) {
      events.push({
        id: '3',
        action: `Diagnosis: ${patient.tb_diagnosed === 'Y' ? 'TB Positive' : 'Not TB'} ${patient.tb_type ? `(${patient.tb_type === 'P' ? 'Pulmonary' : 'Extra-Pulmonary'})` : ''}`,
        staff: patient.staff_name || 'Lab Technician',
        location: patient.referral_facility || patient.facility_name || 'Unknown',
        date: patient.diagnosis_date
      });
    }

    if (patient.att_start_date) {
      events.push({
        id: '4',
        action: `ATT treatment initiated ${patient.nikshay_id ? `(NIKSHAY: ${patient.nikshay_id})` : ''}`,
        staff: patient.staff_name || 'Medical Officer',
        location: patient.facility_name || 'Unknown',
        date: patient.att_start_date
      });
    }

    if (patient.att_completion_date) {
      events.push({
        id: '5',
        action: 'Treatment completed successfully',
        staff: patient.staff_name || 'Medical Officer',
        location: patient.facility_name || 'Unknown',
        date: patient.att_completion_date
      });
    }

    return events.reverse();
  };

  const events = getEvents();

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        <Activity className="w-4 h-4 text-blue-600" />
        <span className="text-slate-900 font-semibold">Medical History</span>
        <span className="ml-auto text-xs text-slate-500">{events.length} events</span>
      </div>

      <div className="space-y-3">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group hover:bg-slate-50 rounded-lg p-3 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-slate-900 text-sm mb-2">{event.action}</div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{event.staff}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <span className="ml-auto">{event.date}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}