'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUp, Users, Clock } from 'lucide-react';
import useSWR from 'swr';
import { usePatientRealtime } from '@/hooks/usePatientRealtime';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TimelineRecord {
  created_at: string;
  inmate_name: string;
  screening_state: string;
  screening_district: string;
  kobo_uuid: string;
}

export default function NeuralTimelineOverview() {
  const { data, mutate } = useSWR<{ records: TimelineRecord[]; total: number }>(
    '/api/patients/timeline',
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
    }
  );

  // Subscribe to real-time updates
  usePatientRealtime(() => {
    console.log('[NeuralTimeline] Patient change detected, refreshing...');
    mutate();
  });

  const records = data?.records || [];
  const total = data?.total || 0;

  // Group by date
  const groupedByDate = records.reduce((acc, record) => {
    const date = new Date(record.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, TimelineRecord[]>);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 my-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Live Data Stream
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Neural Timeline Overview
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Real-time incoming submissions from field operations
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Total Records
                </div>
                <div className="text-3xl font-black text-slate-900 tabular-nums">
                  {total.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-8 max-h-[600px] overflow-y-auto">
          {Object.keys(groupedByDate).length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No recent submissions</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByDate).map(([date, dateRecords]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-sm font-black uppercase tracking-wider text-slate-900">
                      {date}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                    <div className="text-xs font-bold text-slate-400">
                      {dateRecords.length} submissions
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dateRecords.map((record, idx) => {
                      const time = new Date(record.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      });

                      return (
                        <motion.div
                          key={record.kobo_uuid}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-4 p-4 bg-slate-50/50 hover:bg-white border border-slate-100 rounded-xl transition-all duration-200 hover:shadow-md group"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
                              {record.inmate_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {record.inmate_name || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="font-medium">
                                {record.screening_state || 'N/A'}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>
                                {record.screening_district || 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <div className="text-xs font-mono font-bold text-slate-600">
                              {time}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 mt-1">
                              {record.kobo_uuid.substring(0, 8)}
                            </div>
                          </div>

                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Live
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
