'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Eye, ThumbsUp, ThumbsDown, Sparkles, FileText, Activity,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DiagnosticViewerSidePanel = dynamic(
  () => import('@/components/DiagnosticViewerSidePanel'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> }
);

// Public client is fine for reading tasks — RLS handles access control
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TaskStatus =
  | 'pending_ai' | 'analyzing' | 'gemini_scoring'
  | 'auto_reconciled' | 'requires_human_review'
  | 'approved_by_human' | 'rejected_by_human' | 'failed';

interface ReconciliationTask {
  id: string;
  blob_name: string;
  blob_url: string;
  status: TaskStatus;
  confidence_score: number | null;
  gemini_reasoning: string | null;
  proposed_patient_id: string | null;
  evidence_flags: string[];
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  patient_name?: string;
  patient_unique_id?: string;
  patient_district?: string;
}

const STATUS_META: Record<TaskStatus, { label: string; color: string; Icon: any }> = {
  pending_ai:            { label: 'Pending',        color: 'text-slate-500 bg-slate-100',   Icon: Clock },
  analyzing:             { label: 'Analyzing',      color: 'text-blue-600 bg-blue-50',      Icon: Loader2 },
  gemini_scoring:        { label: 'Scoring',        color: 'text-purple-600 bg-purple-50',  Icon: Sparkles },
  auto_reconciled:       { label: 'Auto-Resolved',  color: 'text-emerald-600 bg-emerald-50',Icon: CheckCircle2 },
  requires_human_review: { label: 'Needs Review',   color: 'text-amber-600 bg-amber-50',    Icon: AlertTriangle },
  approved_by_human:     { label: 'Approved',       color: 'text-emerald-700 bg-emerald-100',Icon: ThumbsUp },
  rejected_by_human:     { label: 'Rejected',       color: 'text-red-600 bg-red-50',        Icon: ThumbsDown },
  failed:                { label: 'Failed',         color: 'text-red-700 bg-red-100',       Icon: XCircle },
};

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-emerald-700 bg-emerald-100' : pct >= 50 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';
  return (
    <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest', color)}>
      {pct}% confidence
    </span>
  );
}

export default function SupervisorInbox({ patients }: { patients: any[] }) {
  const [tasks, setTasks] = useState<ReconciliationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReconciliationTask | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [acting, setActing] = useState(false);

  // Build a patient lookup map
  const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

  const fetchTasks = useCallback(async () => {
    const { data, error } = await sb
      .from('ai_reconciliation_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) { console.error('[SupervisorInbox]', error); return; }

    const enriched: ReconciliationTask[] = (data ?? []).map((t: any) => {
      const p = t.proposed_patient_id ? patientMap[t.proposed_patient_id] : null;
      return {
        ...t,
        patient_name: p?.inmate_name ?? '—',
        patient_unique_id: p?.unique_id ?? '—',
        patient_district: p?.screening_district ?? '—',
      };
    });

    setTasks(enriched);
    setLoading(false);
  }, [patientMap]);

  useEffect(() => {
    fetchTasks();

    // Realtime subscription
    const channel = sb
      .channel('art_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_reconciliation_tasks' }, fetchTasks)
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [fetchTasks]);

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    setActing(true);
    try {
      const res = await fetch('/api/link-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selected.proposed_patient_id,
          blob_name: selected.blob_name,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Update task status
      await sb
        .from('ai_reconciliation_tasks')
        .update({ status: 'approved_by_human', reviewed_at: new Date().toISOString() })
        .eq('id', selected.id);

      toast.success(`Linked ${selected.blob_name} → ${selected.patient_name}`);
      setSelected(null);
      fetchTasks();
    } catch (err: any) {
      toast.error('Approval failed', { description: err.message });
    } finally {
      setActing(false);
    }
  }, [selected, fetchTasks]);

  const handleReject = useCallback(async () => {
    if (!selected) return;
    setActing(true);
    try {
      await sb
        .from('ai_reconciliation_tasks')
        .update({
          status: 'rejected_by_human',
          rejection_reason: rejectReason || 'No reason provided',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selected.id);

      toast.success('Task rejected and logged.');
      setSelected(null);
      setShowRejectForm(false);
      setRejectReason('');
      fetchTasks();
    } catch (err: any) {
      toast.error('Rejection failed', { description: err.message });
    } finally {
      setActing(false);
    }
  }, [selected, rejectReason, fetchTasks]);

  // KPI counts
  const needsReview = tasks.filter(t => t.status === 'requires_human_review').length;
  const autoResolved = tasks.filter(t => t.status === 'auto_reconciled').length;
  const approved = tasks.filter(t => t.status === 'approved_by_human').length;
  const total = tasks.filter(t => !['pending_ai', 'analyzing', 'gemini_scoring'].includes(t.status)).length;
  const accuracy = total > 0 ? Math.round(((autoResolved + approved) / total) * 100) : 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* KPI Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Supervisor Mode</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <KpiChip label="Needs Review" value={needsReview} color="text-amber-600" />
        <KpiChip label="Auto-Resolved" value={autoResolved} color="text-emerald-600" />
        <KpiChip label="AI Accuracy" value={`${accuracy}%`} color="text-blue-600" />
        <KpiChip label="Total Tasks" value={total} color="text-slate-600" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Task List */}
        <div className="w-[340px] flex-shrink-0 border-r border-slate-200/60 bg-white/60 overflow-y-auto">
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <CheckCircle2 className="w-12 h-12" />
              <p className="text-sm font-bold">Inbox is clear</p>
            </div>
          )}
          {tasks.map(task => {
            const meta = STATUS_META[task.status];
            const isActive = selected?.id === task.id;
            return (
              <button
                key={task.id}
                onClick={() => { setSelected(task); setShowRejectForm(false); }}
                className={cn(
                  'w-full text-left p-4 border-b border-slate-100 transition-all',
                  isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className={cn('text-xs font-black truncate flex-1', isActive ? 'text-white' : 'text-slate-900')}>
                    {task.blob_name}
                  </p>
                  <span className={cn(
                    'px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex-shrink-0',
                    isActive ? 'bg-white/20 text-white' : meta.color
                  )}>
                    {meta.label}
                  </span>
                </div>
                <p className={cn('text-[10px] font-bold', isActive ? 'text-white/70' : 'text-slate-500')}>
                  → {task.patient_name} · {task.patient_district}
                </p>
                {task.confidence_score !== null && (
                  <div className="mt-1.5">
                    <ConfidenceBadge score={task.confidence_score} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Center: Evidence Viewer */}
        <div className="flex-1 relative overflow-hidden">
          {selected ? (
            <DiagnosticViewerSidePanel file={{ name: selected.blob_name, id: selected.id }} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Eye className="w-12 h-12" />
              <p className="text-sm font-bold">Select a task to review</p>
            </div>
          )}
        </div>

        {/* Right: Verdict Panel */}
        <div className="w-[360px] flex-shrink-0 border-l border-slate-200/60 bg-white/80 backdrop-blur-md flex flex-col overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Sparkles className="w-12 h-12" />
              <p className="text-sm font-bold">AI verdict will appear here</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Proposed Match */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Proposed Match</p>
                <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-1">
                  <p className="text-xl font-black text-slate-900">{selected.patient_name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    ID: {selected.patient_unique_id} · {selected.patient_district}
                  </p>
                  <div className="pt-1">
                    <ConfidenceBadge score={selected.confidence_score} />
                  </div>
                </div>
              </div>

              {/* Evidence Chain */}
              {selected.evidence_flags.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Evidence Chain</p>
                  <div className="space-y-1.5">
                    {selected.evidence_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] font-bold text-blue-800">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Reasoning */}
              {selected.gemini_reasoning && (
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">AI Reasoning</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed">
                    {selected.gemini_reasoning}
                  </div>
                </div>
              )}

              {/* File Info */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">File</p>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {selected.blob_name.endsWith('.dcm') ? (
                    <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <p className="text-xs font-bold text-slate-700 truncate">{selected.blob_name}</p>
                </div>
              </div>

              {/* Action Buttons — only show for tasks needing review */}
              {selected.status === 'requires_human_review' && (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={acting || !selected.proposed_patient_id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    Approve Link → {selected.patient_name}
                  </button>

                  {!showRejectForm ? (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={acting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reject
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (optional)..."
                        rows={3}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={acting}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                        >
                          {acting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reject'}
                        </button>
                        <button
                          onClick={() => setShowRejectForm(false)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Already actioned */}
              {['approved_by_human', 'rejected_by_human', 'auto_reconciled'].includes(selected.status) && (
                <div className={cn(
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold',
                  selected.status === 'approved_by_human' || selected.status === 'auto_reconciled'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}>
                  {selected.status === 'rejected_by_human'
                    ? <><XCircle className="w-4 h-4" /> Rejected: {selected.rejection_reason ?? '—'}</>
                    : <><CheckCircle2 className="w-4 h-4" /> This task has been resolved.</>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('text-lg font-black', color)}>{value}</span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
