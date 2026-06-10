'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  Info,
  ExternalLink,
  FileSpreadsheet,
  Sparkles,
  X,
  ArrowLeft,
  Building,
  Calendar,
  User,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { sounds } from '@/lib/sound';
import { useSessionScope } from '@/hooks/useSessionScope';
import { toast } from 'sonner';
import { QuarantineRecord, QuarantineStatus } from '@/types/ingestion';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function IngestionReconciliationTerminal() {
  const scope = useSessionScope();
  
  // Canvas generative backdrop ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveColors = useMemo(() => [
    'rgba(168, 85, 247, 0.15)',  // Violet
    'rgba(99, 102, 241, 0.15)',   // Indigo
    'rgba(6, 182, 212, 0.15)',    // Cyan
    'rgba(244, 63, 94, 0.15)',    // Rose
    'rgba(16, 185, 129, 0.15)',   // Emerald
    'rgba(234, 179, 8, 0.15)',    // Amber
  ], []);

  const [colorIndex, setColorIndex] = useState(0);
  const colorIndexRef = useRef(colorIndex);
  
  useEffect(() => {
    colorIndexRef.current = colorIndex;
  }, [colorIndex]);

  const cycleWaveColor = useCallback(() => {
    setColorIndex((prev) => (prev + 1) % waveColors.length);
  }, [waveColors.length]);

  // Handle pointer down on background (excluding interactive elements)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' || 
      target.tagName === 'SELECT' || 
      target.closest('button') || 
      target.closest('a') ||
      target.closest('.interactive-control')
    ) {
      return;
    }
    cycleWaveColor();
  }, [cycleWaveColor]);

  // Backdrop canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    interface WavePoint {
      nx: number;
      ny: number;
      x?: number;
      y?: number;
    }
    interface WaveLine {
      points: WavePoint[];
      ran: number;
    }
    const lines: WaveLine[] = [];

    const setup = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      lines.length = 0;
      const lineCount = Math.max(12, Math.floor(height / 28));
      const pointCount = 14;
      const spacingH = width / pointCount;
      const spacingV = height / lineCount;

      for (let v = 0; v < lineCount; v++) {
        const line: WaveLine = {
          points: [],
          ran: 0.2 + Math.random() * 0.7,
        };

        for (let h = 0; h < pointCount; h++) {
          line.points.push({
            nx: h * spacingH,
            ny: v * spacingV,
          });
        }
        line.points.push({
          nx: width + spacingH,
          ny: v * spacingV,
        });
        lines.push(line);
      }
    };

    setup();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setup();
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    let step = 0;

    const update = () => {
      step += 0.3; // Gentle animation pace
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = waveColors[colorIndexRef.current];

      lines.forEach((line) => {
        line.points.forEach((point) => {
          point.x = point.nx;
          point.y =
            point.ny +
            Math.sin((point.x * line.ran + (step + point.ny)) / 40) *
              (4 + (point.ny / height) * 25);
        });

        ctx.beginPath();
        line.points.forEach((point, h) => {
          const nextPoint = line.points[h + 1];
          if (h === 0) {
            ctx.moveTo(point.x!, point.y!);
          } else if (nextPoint) {
            const cpx = point.x! + (nextPoint.x! - point.x!) / 2;
            const cpy = point.y! + (nextPoint.y! - point.y!) / 2;
            ctx.quadraticCurveTo(point.x!, point.y!, cpx, cpy);
          }
        });
        ctx.stroke();
      });

      animationId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      clearTimeout(resizeTimeout);
    };
  }, [waveColors]);

  const { data, error, isLoading, mutate } = useSWR<{ records: QuarantineRecord[] }>(
    '/api/quarantine/list',
    fetcher
  );

  const [activeTab, setActiveTab] = useState<'staged' | 'conflict' | 'resolved'>('staged');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedConflict, setSelectedConflict] = useState<QuarantineRecord | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const handleTabChange = (tab: 'staged' | 'conflict' | 'resolved') => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    sounds.navTab();
  };

  const records = data?.records || [];

  // Group records into Buckets
  const bucketA = useMemo(() => {
    return records.filter(
      r => r.quarantine_status !== 'SYNCHRONIZED' && r.quarantine_status !== 'REJECTED' && r.confidence_score === 'low'
    );
  }, [records]);

  const bucketB = useMemo(() => {
    return records.filter(
      r => r.quarantine_status !== 'SYNCHRONIZED' && r.quarantine_status !== 'REJECTED' && r.confidence_score === 'medium'
    );
  }, [records]);

  const bucketC = useMemo(() => {
    return records.filter(r => r.quarantine_status === 'SYNCHRONIZED' || r.quarantine_status === 'FAILED_RETRY');
  }, [records]);

  // Checkbox toggles
  const handleToggleSelect = (id: string) => {
    sounds.toggle();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllBucketA = () => {
    sounds.toggle();
    if (selectedIds.size === bucketA.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bucketA.map(r => r.id)));
    }
  };

  const handleToggleSelectAllBucketC = () => {
    sounds.toggle();
    const syncable = bucketC.filter(r => r.quarantine_status !== 'DISPATCHING');
    if (selectedIds.size === syncable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(syncable.map(r => r.id)));
    }
  };

  // Synchronize / Resolve API handler with optimistic UI updates
  const handleResolveBatch = async (
    resolutions: Array<{ id: string; action: 'APPROVE_NEW' | 'MERGE_CANDIDATE' | 'REJECT'; candidateId?: string }>
  ) => {
    if (resolutions.length === 0) return;

    setIsResolving(true);
    const prevData = data;
    const resolvedIds = new Set(resolutions.map(r => r.id));

    // Optimistically update the local cache
    mutate(
      (current: any) => {
        if (!current?.records) return current;
        return {
          ...current,
          records: current.records.map((r: any) => {
            if (resolvedIds.has(r.id)) {
              const res = resolutions.find(x => x.id === r.id);
              if (res?.action === 'REJECT') {
                return null;
              }
              // Mark as dispatching/synchronized temporarily
              return {
                ...r,
                quarantine_status: 'SYNCHRONIZED',
              };
            }
            return r;
          }).filter(Boolean)
        };
      },
      false
    );

    try {
      const response = await fetch('/api/quarantine/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Records reconciled successfully');
        sounds.success();
        setSelectedIds(new Set());
        setSelectedConflict(null);
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to sync resolutions to database');
      }
    } catch (err: any) {
      console.error('[Ingestion Dashboard] Error:', err);
      toast.error(err.message || 'Error occurred while resolving.');
      sounds.error();
      // Rollback on failure
      mutate(prevData, false);
    } finally {
      setIsResolving(false);
      mutate(); // Get fresh server data
    }
  };

  // Quick action triggers
  const approveAsNew = (record: QuarantineRecord) => {
    handleResolveBatch([{ id: record.id, action: 'APPROVE_NEW' }]);
  };

  const rejectRecord = (record: QuarantineRecord) => {
    sounds.deleteConfirm();
    handleResolveBatch([{ id: record.id, action: 'REJECT' }]);
  };

  const mergeRecord = (record: QuarantineRecord) => {
    if (!record.candidate_match) return;
    handleResolveBatch([
      { id: record.id, action: 'MERGE_CANDIDATE', candidateId: record.candidate_match.id }
    ]);
  };

  const publishBucketA = () => {
    const batch = Array.from(selectedIds).map(id => ({
      id,
      action: 'APPROVE_NEW' as const
    }));
    handleResolveBatch(batch);
  };

  const purgeBucketA = () => {
    sounds.deleteConfirm();
    const batch = Array.from(selectedIds).map(id => ({
      id,
      action: 'REJECT' as const
    }));
    handleResolveBatch(batch);
  };

  const syncBucketC = () => {
    const idsToSync = selectedIds.size > 0 ? Array.from(selectedIds) : bucketC.map(r => r.id);
    const batch = idsToSync.map(id => {
      const record = bucketC.find(r => r.id === id);
      if (!record) return null;
      if (record.candidate_match) {
        return {
          id: record.id,
          action: 'MERGE_CANDIDATE' as const,
          candidateId: record.candidate_match.id
        };
      } else {
        return {
          id: record.id,
          action: 'APPROVE_NEW' as const
        };
      }
    }).filter(Boolean);

    if (batch.length === 0) return;
    handleResolveBatch(batch as any);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="relative min-h-screen bg-slate-50 overflow-hidden flex flex-col p-6 lg:p-8 z-10 select-none"
    >
      {/* Canvas backdrop */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Main interface wrapper */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
        
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/vertex"
                className="interactive-control p-2 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-600 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Ingestion Reconciliation Terminal
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center gap-1.5 animate-pulse">
                  <Zap className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                  Staging Terminal
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Review and reconcile patient details parsed from X-Ray files, PDF reports, and Excel templates before committing them to the permanent health registry.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto interactive-control">
            {scope && (
              <div className="px-4 py-2 bg-slate-100/80 border border-slate-200/50 rounded-2xl flex flex-col gap-0.5 text-right shadow-sm">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Geographic Scope</span>
                <span className="text-xs font-bold text-slate-700">
                  {scope.state} {scope.district && `· ${scope.district}`}
                </span>
              </div>
            )}
            <button
              onClick={() => {
                sounds.buttonClick();
                mutate();
              }}
              disabled={isLoading || isResolving}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-600 shadow-sm transition-all flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Overview Stats Row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="vertex-glass-card rounded-[20px] p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Staged</span>
            <span className="text-2xl font-black text-slate-950">{records.length}</span>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-slate-800 h-full" style={{ width: `${records.length > 0 ? 100 : 0}%` }} />
            </div>
          </div>
          
          <div className="vertex-glass-card rounded-[20px] p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Staged New Entries</span>
            <span className="text-2xl font-black text-indigo-950">{bucketA.length}</span>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${records.length > 0 ? (bucketA.length / records.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="vertex-glass-card rounded-[20px] p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Ambiguous Conflicts</span>
            <span className="text-2xl font-black text-amber-950">{bucketB.length}</span>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: `${records.length > 0 ? (bucketB.length / records.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="vertex-glass-card rounded-[20px] p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Auto-Resolved Log</span>
            <span className="text-2xl font-black text-emerald-950">{bucketC.length}</span>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${records.length > 0 ? (bucketC.length / records.length) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <nav className="flex border-b border-slate-200/50 pb-0.5 gap-2 interactive-control">
          <button
            onClick={() => handleTabChange('staged')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'staged'
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bucket A: New Entries ({bucketA.length})
          </button>
          
          <button
            onClick={() => handleTabChange('conflict')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'conflict'
                ? 'border-amber-500 text-amber-600 bg-amber-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Bucket B: Conflicts ({bucketB.length})
          </button>
          
          <button
            onClick={() => handleTabChange('resolved')}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'resolved'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Bucket C: Auto-Resolved ({bucketC.length})
          </button>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 relative">
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm z-30">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Loading quarantine staging ledger...</p>
            </div>
          )}

          {/* TAB 1: BUCKET A */}
          {activeTab === 'staged' && (
            <div className="flex flex-col h-full gap-4">
              {/* Batch Actions Header */}
              {bucketA.length > 0 && (
                <div className="flex items-center justify-between bg-white border border-slate-200/60 px-4 py-3 rounded-2xl shadow-sm interactive-control">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === bucketA.length && bucketA.length > 0}
                      onChange={handleToggleSelectAllBucketA}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600">
                      {selectedIds.size} of {bucketA.length} selected
                    </span>
                  </div>
                  
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={purgeBucketA}
                        disabled={isResolving}
                        className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reject Selected
                      </button>
                      
                      <button
                        onClick={publishBucketA}
                        disabled={isResolving}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Synchronize Selected
                      </button>
                    </div>
                  )}
                </div>
              )}

              {bucketA.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/60 border border-slate-100 rounded-3xl text-center shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No New Staged Records</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    All extracted patient files have been processed or resolved. Upload another register file to initiate staging.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucketA.map(record => (
                    <div
                      key={record.id}
                      className={`vertex-glass-card rounded-[22px] p-4 flex flex-col gap-3 shadow-sm border transition-all ${
                        selectedIds.has(record.id) ? 'ring-2 ring-indigo-500 border-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => handleToggleSelect(record.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1 interactive-control"
                          />
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {record.patient_name}
                            </h4>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-300" />
                              {record.facility_name}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1">
                          {record.status}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Date: {record.screening_date}
                        </span>
                        
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 font-bold text-[9px] uppercase">
                          New Entry
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 interactive-control">
                        <button
                          onClick={() => rejectRecord(record)}
                          disabled={isResolving}
                          className="px-3 py-1.5 hover:bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Discard
                        </button>
                        
                        <button
                          onClick={() => approveAsNew(record)}
                          disabled={isResolving}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUCKET B (CONFLICTS) */}
          {activeTab === 'conflict' && (
            <div className="flex flex-col h-full gap-4">
              {bucketB.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/60 border border-slate-100 rounded-3xl text-center shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Zero Ambiguous Discrepancies</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No matching records fall within the ambiguous gray-zone threshold (65% to 85% similarity).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucketB.map(record => {
                    const matchPercent = record.candidate_match
                      ? Math.round(record.candidate_match.similarity_score * 100)
                      : 0;

                    return (
                      <div
                        key={record.id}
                        className="vertex-glass-card rounded-[22px] p-4 flex flex-col gap-3 shadow-sm border border-amber-200/80 bg-amber-50/5 relative overflow-hidden"
                      >
                        {/* Conflict background glow overlay */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {record.patient_name}
                            </h4>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-300" />
                              {record.facility_name}
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-amber-100 border border-amber-200 text-amber-700 flex items-center gap-1 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            {matchPercent}% Match
                          </span>
                        </div>

                        <div className="bg-amber-50/60 border border-amber-100/80 rounded-xl p-2.5 text-[11px] text-amber-800 leading-normal flex gap-2 relative z-10">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Conflict Reason:</span>
                            <p className="text-amber-700/90 mt-0.5">{record.conflict_reason}</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Date: {record.screening_date}
                          </span>

                          <span className="text-[10px] text-slate-400 italic">
                            vs. {record.candidate_match?.patient_name}
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex items-center gap-2 interactive-control relative z-10">
                          <button
                            onClick={() => rejectRecord(record)}
                            disabled={isResolving}
                            className="p-2 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                            title="Discard Staged Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              sounds.buttonClick();
                              setSelectedConflict(record);
                            }}
                            disabled={isResolving}
                            className="flex-1 py-1.5 border border-amber-300 hover:bg-amber-50 text-amber-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            Review Discrepancy
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUCKET C (AUTO-RESOLVED LOG) */}
          {activeTab === 'resolved' && (
            <div className="flex flex-col h-full gap-4">
              {bucketC.length > 0 && (
                <div className="flex items-center justify-between bg-white border border-slate-200/60 px-4 py-3 rounded-2xl shadow-sm interactive-control">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === bucketC.filter(r => r.quarantine_status !== 'DISPATCHING').length && bucketC.length > 0}
                      onChange={handleToggleSelectAllBucketC}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select records to sync'}
                    </span>
                  </div>

                  <button
                    onClick={syncBucketC}
                    disabled={isResolving || (selectedIds.size === 0 && bucketC.length === 0)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResolving ? 'animate-spin' : ''}`} />
                    {selectedIds.size > 0 ? 'Sync Selected to Sheets' : 'Sync All Resolved Logs'}
                  </button>
                </div>
              )}

              {bucketC.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/60 border border-slate-100 rounded-3xl text-center shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Auto-Resolved Queue Empty</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    There are no high-confidence matching records queued for database synchronization.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucketC.map(record => {
                    const isFailedSync = record.quarantine_status === 'FAILED_RETRY';
                    
                    return (
                      <div
                        key={record.id}
                        className={`vertex-glass-card rounded-[22px] p-4 flex flex-col gap-3 shadow-sm border transition-all ${
                          isFailedSync 
                            ? 'border-red-200 bg-red-50/5' 
                            : selectedIds.has(record.id)
                              ? 'ring-2 ring-emerald-500 border-emerald-500' 
                              : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record.id)}
                              disabled={record.quarantine_status === 'DISPATCHING'}
                              onChange={() => handleToggleSelect(record.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1 interactive-control"
                            />
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {record.patient_name}
                              </h4>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-300" />
                                {record.facility_name}
                              </span>
                            </div>
                          </div>

                          {isFailedSync ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-red-100 border border-red-200 text-red-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Sync Failed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>

                        {record.candidate_match ? (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[11px] text-slate-600 leading-normal flex flex-col gap-1">
                            <div className="flex items-center justify-between font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                              <span>Auto-Linked Candidate</span>
                              <span>{Math.round(record.candidate_match.similarity_score * 100)}% match</span>
                            </div>
                            <p className="font-bold text-slate-700 mt-1">{record.candidate_match.patient_name}</p>
                            <p className="text-[10px] text-slate-400">{record.candidate_match.facility_name} · {record.candidate_match.status}</p>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-2.5 text-[11px] text-emerald-800 leading-normal flex gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-900">Auto-Approve New Inmate</span>
                              <p className="text-emerald-700 mt-0.5">High confidence. No duplicates found in active scope.</p>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Date: {record.screening_date}
                          </span>

                          <span className="text-[10px] text-slate-400">
                            ID: {record.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex items-center gap-2 interactive-control">
                          <button
                            onClick={() => rejectRecord(record)}
                            disabled={isResolving}
                            className="px-3 py-1.5 hover:bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 flex-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Discard
                          </button>
                          
                          <button
                            onClick={() => {
                              if (record.candidate_match) {
                                mergeRecord(record);
                              } else {
                                approveAsNew(record);
                              }
                            }}
                            disabled={isResolving}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 flex-1 shadow-md shadow-emerald-100"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isResolving ? 'animate-spin' : ''}`} />
                            Force Sync
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* DISCREPANCY COMPARISON DRAWER */}
      <AnimatePresence>
        {selectedConflict && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConflict(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40"
            />

            {/* Slide-out Panel */}
            <motion.aside
              initial={{ x: '100%', opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                    Reconciliation Comparison
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare extracted values against the matched registry candidate.
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                
                {/* Visual match badge */}
                <div className="vertex-glass-card rounded-2xl p-4 border border-amber-200/70 bg-amber-50/20 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Gray-Zone Ambiguous Match</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Confidence is below the 85% deterministic threshold.</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-amber-600">
                    {selectedConflict.candidate_match
                      ? Math.round(selectedConflict.candidate_match.similarity_score * 100)
                      : 0}%
                  </span>
                </div>

                {/* Grid Comparisons */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ledger Verification</span>
                  
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                          <th className="px-4 py-3">Field</th>
                          <th className="px-4 py-3">Extracted File Value</th>
                          <th className="px-4 py-3">Existing Registry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* Name Row */}
                        <tr className={`
                          ${
                            selectedConflict.patient_name.toLowerCase() !== selectedConflict.candidate_match?.patient_name.toLowerCase()
                              ? 'bg-amber-50/40 text-amber-950 font-semibold'
                              : 'text-slate-700'
                          }
                        `}>
                          <td className="px-4 py-3 font-semibold text-slate-400">Inmate Name</td>
                          <td className="px-4 py-3">{selectedConflict.patient_name}</td>
                          <td className="px-4 py-3">{selectedConflict.candidate_match?.patient_name}</td>
                        </tr>

                        {/* Date Row */}
                        <tr className={`
                          ${
                            selectedConflict.screening_date !== selectedConflict.candidate_match?.screening_date
                              ? 'bg-amber-50/40 text-amber-950 font-semibold'
                              : 'text-slate-700'
                          }
                        `}>
                          <td className="px-4 py-3 font-semibold text-slate-400">Screening Date</td>
                          <td className="px-4 py-3">{selectedConflict.screening_date}</td>
                          <td className="px-4 py-3">{selectedConflict.candidate_match?.screening_date}</td>
                        </tr>

                        {/* Facility Row */}
                        <tr className={`
                          ${
                            selectedConflict.facility_name.toLowerCase() !== selectedConflict.candidate_match?.facility_name.toLowerCase()
                              ? 'bg-amber-50/40 text-amber-950 font-semibold'
                              : 'text-slate-700'
                          }
                        `}>
                          <td className="px-4 py-3 font-semibold text-slate-400">Facility Name</td>
                          <td className="px-4 py-3">{selectedConflict.facility_name}</td>
                          <td className="px-4 py-3">{selectedConflict.candidate_match?.facility_name}</td>
                        </tr>

                        {/* Status Row */}
                        <tr className={`
                          ${
                            selectedConflict.status.toLowerCase() !== selectedConflict.candidate_match?.status.toLowerCase()
                              ? 'bg-amber-50/40 text-amber-950 font-semibold'
                              : 'text-slate-700'
                          }
                        `}>
                          <td className="px-4 py-3 font-semibold text-slate-400">X-Ray Result</td>
                          <td className="px-4 py-3">{selectedConflict.status}</td>
                          <td className="px-4 py-3">{selectedConflict.candidate_match?.status}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Extracted Metadata */}
                {selectedConflict.extracted_details && Object.keys(selectedConflict.extracted_details).length > 0 && (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Parsed File Metadata</span>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                      {Object.entries(selectedConflict.extracted_details).map(([key, val]) => {
                        if (typeof val === 'object' || !val) return null;
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return (
                          <div key={key} className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                            <p className="text-xs font-bold text-slate-700">{val.toString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => approveAsNew(selectedConflict)}
                    disabled={isResolving}
                    className="py-3 border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    Approve As New Patient
                  </button>

                  <button
                    onClick={() => mergeRecord(selectedConflict)}
                    disabled={isResolving || !selectedConflict.candidate_match}
                    className="py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-100"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Merge & Update Candidate
                  </button>
                </div>

                <button
                  onClick={() => rejectRecord(selectedConflict)}
                  disabled={isResolving}
                  className="w-full py-2.5 hover:bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard and Reject Staged Entry
                </button>
              </div>

            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
