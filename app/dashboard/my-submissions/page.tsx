'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar as CalendarIcon, TrendingUp, Plus, Inbox, AlertCircle, List } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { calculatePatientPhase } from '@/lib/phase-engine';
import { createClient } from '@/lib/supabase-client';
import { fuzzyStaffLookup } from '@/lib/fuzzy-staff-lookup';
import { useRealtimePatients } from '@/lib/useRealtimePatients';
import { ScreeningCalendar } from '@/components/ScreeningCalendar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
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
  const { pendingCount, isSyncing, syncPending, isOnline } = useOfflineSync();
  const supabase = createClient();

  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [matchStrategy, setMatchStrategy] = useState<string>('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const staffName = scope?.staffName || session?.user?.staffName || session?.user?.name;
  const userName = session?.user?.name || 'Officer';
  const userFacility = session?.user?.district || 'Your Facility';

  // Realtime subscription for live updates
  const { status: realtimeStatus } = useRealtimePatients({
    onInsert: (patient) => {
      // Only add if it matches current user's staff name
      const patientStaffName = patient.staff_name as string;
      if (patientStaffName && staffName && 
          patientStaffName.toLowerCase().includes(staffName.toLowerCase())) {
        setPatients(prev => [patient, ...prev]);
        sounds.newSubmission?.();
      }
    },
    onUpdate: (patient) => {
      setPatients(prev => 
        prev.map(p => p.id === patient.id ? { ...p, ...patient } : p)
      );
    },
    showToasts: false, // Disable default toasts since this is personal view
  });

  // Fetch submissions with fuzzy lookup
  useEffect(() => {
    if (!staffName) {
      setIsLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const result = await fuzzyStaffLookup(
          supabase,
          staffName,
          'id, kobo_uuid, unique_id, inmate_name, screening_date, screening_district, created_at, tb_diagnosed',
          100
        );
        
        setPatients(result.data);
        setMatchStrategy(result.strategy);
      } catch (error) {
        console.error('[my-submissions] Fetch error:', error);
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [staffName, supabase]);

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

  // Build calendar data
  const calendarData = useMemo(() => {
    const map: Record<string, { count: number; tbPositive: number }> = {};
    patients.forEach(p => {
      const date = p.screening_date || p.created_at?.split('T')[0];
      if (!date) return;
      if (!map[date]) map[date] = { count: 0, tbPositive: 0 };
      map[date].count++;
      if (p.tb_diagnosed === 'Yes') map[date].tbPositive++;
    });
    return Object.entries(map).map(([date, v]) => ({ date, count: v.count, tbPositive: v.tbPositive, suspected: 0, attStarted: 0, referred: 0 }));
  }, [patients]);

  // Handle calendar day click
  const handleDayClick = useCallback((date: string) => {
    sounds.calendarClick();
    setSelectedCalendarDate(prev => prev === date ? null : date);
    setView('list');
  }, []);

  // Filter patients by selected date
  const displayedPatients = useMemo(() => {
    if (!selectedCalendarDate) return patients;
    return patients.filter(p => {
      const date = p.screening_date || p.created_at?.split('T')[0];
      return date === selectedCalendarDate;
    });
  }, [patients, selectedCalendarDate]);

  // Sort patients by submission date (newest first)
  const sortedPatients = useMemo(() => {
    return [...displayedPatients].sort((a, b) => {
      const dateA = new Date(a.screening_date || a.created_at).getTime();
      const dateB = new Date(b.screening_date || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [displayedPatients]);

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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-black text-slate-900 mb-2">
                  Welcome, {userName}
                </h1>
                <p className="text-lg text-slate-600 font-medium">
                  Here are your screening submissions from <span className="font-bold text-emerald-600">{userFacility}</span>
                </p>
                {process.env.NODE_ENV === 'development' && staffName && (
                  <p className="text-xs text-slate-500 mt-2 font-mono">
                    Searching as: <strong className="text-emerald-600">{staffName}</strong>
                    {matchStrategy && (
                      <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[10px]">
                        match: {matchStrategy}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {/* Realtime Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  realtimeStatus === 'connected' && "bg-emerald-500 animate-pulse",
                  realtimeStatus === 'connecting' && "bg-amber-500 animate-pulse",
                  realtimeStatus === 'disconnected' && "bg-slate-400",
                  realtimeStatus === 'error' && "bg-red-500"
                )} />
                <span className="text-xs font-medium text-slate-600">
                  {realtimeStatus === 'connected' && 'Live'}
                  {realtimeStatus === 'connecting' && 'Connecting...'}
                  {realtimeStatus === 'disconnected' && 'Offline'}
                  {realtimeStatus === 'error' && 'Error'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* No Staff Name Warning */}
          {!staffName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Staff name not configured
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Contact your administrator to set up your profile name for submission tracking.
                </p>
              </div>
            </motion.div>
          )}

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={CalendarIcon} label="Today" value={stats.today} delay={0.1} />
            <StatCard icon={TrendingUp} label="This Week" value={stats.week} delay={0.2} />
            <StatCard icon={FileText} label="Total Submitted" value={stats.total} delay={0.3} />
          </div>

          {/* View Toggle */}
          {patients.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex items-center justify-between mb-6"
            >
              <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                {(['list', 'calendar'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all',
                      view === v
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {v === 'list' ? (
                      <>
                        <List size={16} />
                        List View
                      </>
                    ) : (
                      <>
                        <CalendarIcon size={16} />
                        Calendar View
                      </>
                    )}
                  </button>
                ))}
              </div>

              {selectedCalendarDate && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <span className="text-sm text-emerald-700">
                    Showing: <strong>{new Date(selectedCalendarDate + 'T00:00:00')
                      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    }</strong>
                  </span>
                  <button
                    onClick={() => setSelectedCalendarDate(null)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 underline"
                  >
                    Clear
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Calendar View */}
          <AnimatePresence mode="wait">
            {view === 'calendar' && patients.length > 0 && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                    Your Screening Activity
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Click any day to see that day's submissions
                  </p>
                </div>
                <ScreeningCalendar
                  data={calendarData}
                  onDayClick={handleDayClick}
                  selectedDate={selectedCalendarDate}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit New Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Link 
              href="/dashboard/submit-new"
              onClick={() => sounds.primaryAction()}
              className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Submit New Record →
            </Link>
          </motion.div>

          {/* Patient List */}
          {view === 'list' && sortedPatients.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center"
            >
              <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {selectedCalendarDate ? 'No screenings on this day' : "You haven't submitted any records yet"}
              </h3>
              <p className="text-slate-600 mb-6">
                {selectedCalendarDate 
                  ? 'Try selecting a different day from the calendar'
                  : 'Start screening patients and your submissions will appear here'
                }
              </p>
              {!selectedCalendarDate && (
                <Link 
                  href="/dashboard/submit-new"
                  onClick={() => sounds.primaryAction()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Start Screening →
                </Link>
              )}
            </motion.div>
          )}

          {view === 'list' && sortedPatients.length > 0 && (
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
