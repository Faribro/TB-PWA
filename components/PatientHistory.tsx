'use client';

import { Calendar, MapPin, User, MessageSquare } from 'lucide-react';

interface Patient {
  screening_date: string;
  facility_name: string;
  referral_date?: string | null;
  coordinator_name?: string;
  assigned_to?: string;
  staff_name?: string;
  remarks?: string;
  att_start_date?: string | null;
  updated_at?: string;
}

interface PatientHistoryProps {
  patient: Patient;
}

export default function PatientHistory({ patient }: PatientHistoryProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const timeline = [
    {
      date: patient.screening_date,
      icon: Calendar,
      label: 'Screened',
      detail: `at ${patient.facility_name}`,
      color: 'text-blue-600 bg-blue-50'
    },
    patient.referral_date && {
      date: patient.referral_date,
      icon: User,
      label: 'Referral Initiated',
      detail: `by ${patient.coordinator_name || patient.assigned_to || patient.staff_name || 'Staff'}`,
      color: 'text-purple-600 bg-purple-50'
    },
    patient.att_start_date && {
      date: patient.att_start_date,
      icon: MapPin,
      label: 'ATT Started',
      detail: 'Treatment initiated',
      color: 'text-green-600 bg-green-50'
    },
    patient.remarks && {
      date: patient.updated_at || patient.screening_date,
      icon: MessageSquare,
      label: 'Last Remark',
      detail: patient.remarks,
      color: 'text-amber-600 bg-amber-50'
    }
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Patient History</h3>
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        
        {/* Timeline Items */}
        <div className="space-y-6">
          {timeline.map((item: any, idx) => (
            <div key={idx} className="relative flex gap-4">
              {/* Icon */}
              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${item.color} flex items-center justify-center`}>
                <item.icon className="w-4 h-4" />
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="text-xs text-slate-500 mb-1">{formatDate(item.date)}</div>
                <div className="font-semibold text-sm text-slate-900">{item.label}</div>
                <div className="text-sm text-slate-600 mt-1">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
