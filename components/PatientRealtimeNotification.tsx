'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, UserPlus, Edit3, Trash2, Clock } from 'lucide-react';
import { usePatientRealtime } from '@/hooks/usePatientRealtime';

interface PatientChangeEvent {
  id: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  patientName: string;
  timestamp: number;
  fields?: string[];
}

export function PatientRealtimeNotification() {
  const [events, setEvents] = useState<PatientChangeEvent[]>([]);

  usePatientRealtime((payload) => {
    const patientData = payload.new || payload.old || {};
    const patientName = patientData.inmate_name || patientData.patient_name || 'Unknown Patient';
    const patientId = patientData.id || patientData.kobo_uuid || 'unknown';

    const newEvent: PatientChangeEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: payload.eventType,
      patientName,
      timestamp: Date.now(),
      fields: payload.new ? Object.keys(payload.new) : undefined
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 5));

    setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== newEvent.id));
    }, 5000);
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'INSERT': return <UserPlus className="w-4 h-4" />;
      case 'UPDATE': return <Edit3 className="w-4 h-4" />;
      case 'DELETE': return <Trash2 className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'INSERT': return 'bg-emerald-100 text-emerald-600';
      case 'UPDATE': return 'bg-blue-100 text-blue-600';
      case 'DELETE': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getEventTitle = (type: string) => {
    switch (type) {
      case 'INSERT': return 'New Patient Registered';
      case 'UPDATE': return 'Patient Updated';
      case 'DELETE': return 'Patient Removed';
      default: return 'Patient Change';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white/95 backdrop-blur-xl border border-slate-200/70 shadow-xl px-4 py-3 rounded-2xl flex items-start gap-3 pointer-events-auto"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getEventColor(event.eventType)}`}>
              {getEventIcon(event.eventType)}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{getEventTitle(event.eventType)}</span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <span className="text-xs text-slate-600 font-medium truncate" title={event.patientName}>
                {event.patientName}
              </span>
              {event.fields && event.fields.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.fields.slice(0, 4).map((field, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono"
                    >
                      {field}
                    </span>
                  ))}
                  {event.fields.length > 4 && (
                    <span className="text-[9px] text-slate-400">+{event.fields.length - 4} more</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
