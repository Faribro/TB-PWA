'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, TrendingUp, Plus, Inbox } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { calculatePatientPhase } from '@/lib/phase-engine';
import Link from 'next/link';

function StatCard({ icon: Icon, label, value, delay }: {
  icon: any;
  label: string;
  value: string | number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 flex items-center gap-4"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black tracking-tighter text-slate-900">{value}</p>
      </div>
    </motion.div>
  );
}

export default function MySubmissionsPage() {
  const { data: session } = useSession();
  const scope = useSessionScope();
  const { data: patients = [], isLoading } = useSWRAllPatients(scope);
  const { pendingCount, isSyncing, syncPending, isOnline } = useOfflineSync();

  const userName = session?.user?.name || 'Officer';
  const userFacility = session?.user?.district || 'Your Facility';

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayCount = patients.filter(p => {
      const submittedDate = new Date(p.screening_date || p.created_at);
      return submittedDate >= today;
    }).length;

    const weekCount = patients.filter(p => {
      const submittedDate = new Date(p.screening_date || p.created_at);
      return submittedDate >= weekAgo;
    }).length;

    return {
      today: todayCount,
      week: weekCount,
      total: patients.length,
    };
  }, [patients]);

  // Sort patients by submission date (newest first)
  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      const dateA = new Date(a.screening_date || a.created_at).getTime();
      const dateB = new Date(b.screening_date || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [patients]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">
            Loading Your Records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 relative overflow-hidden">
      {/* Soft Background Pattern */}
      <div 
        className="fixed inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-50"
      />
      
      {/* Content */}
      <div className="relative z-10 h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-black text-slate-900 mb-2">
              Welcome, {userName}
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Here are your screening submissions from <span className="font-bold text-emerald-600">{userFacility}</span>
            </p>
          </motion.div>

          {/* Offline Sync Banner */}
          {pendingCount > 0 && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[#964219]/8 border border-[#964219]/15
                            flex items-center justify-between gap-3">
              <p className="text-sm text-[#964219]">
                <span className="font-medium">{pendingCount} record{pendingCount > 1 ? 's' : ''}</span>
                {' '}
                saved offline · {isOnline ? 'Ready to sync' : 'Waiting for connection'}
              </p>
              {isOnline && (
                <button
                  onClick={syncPending}
                  disabled={isSyncing}
                  className="text-sm font-medium text-[#964219] underline underline-offset-2
                             disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isSyncing ? 'Syncing…' : 'Sync now'}
                </button>
              )}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatCard icon={Calendar} label="Today" value={stats.today} delay={0.1} />
            <StatCard icon={TrendingUp} label="This Week" value={stats.week} delay={0.2} />
            <StatCard icon={FileText} label="Total Submitted" value={stats.total} delay={0.3} />
          </div>

          {/* Submit New Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Link 
              href="https://kf.kobotoolbox.org" 
              target="_blank"
              className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Submit New Record →
            </Link>
          </motion.div>

          {/* Patient List */}
          {sortedPatients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center"
            >
              <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                You haven't submitted any records yet
              </h3>
              <p className="text-slate-600 mb-6">
                Start screening patients and your submissions will appear here
              </p>
              <Link 
                href="https://kf.kobotoolbox.org" 
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Start Screening →
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                  My Screening Records
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {sortedPatients.length} patient{sortedPatients.length !== 1 ? 's' : ''} submitted
                </p>
              </div>
              
              <div className="divide-y divide-slate-100">
                {sortedPatients.map((patient, idx) => {
                  const { phase } = calculatePatientPhase(patient);
                  const submittedDate = new Date(patient.screening_date || patient.created_at);
                  const formattedDate = submittedDate.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + (idx * 0.05) }}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1">
                            {patient.inmate_name || 'Unknown Patient'}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                              {patient.unique_id || patient.kobo_uuid?.substring(0, 8)}
                            </span>
                            <span>Screened: {formattedDate}</span>
                            <span>{patient.screening_district}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                            phase === 'Sputum Test' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            phase === 'Diagnosis' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            phase === 'ATT Initiation' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            phase === 'Closed' ? 'bg-slate-50 text-slate-700 border border-slate-200' :
                            'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {phase}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
