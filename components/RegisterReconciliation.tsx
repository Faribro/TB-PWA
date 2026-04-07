'use client';

/**
 * RegisterReconciliation.tsx
 *
 * Real-time Patient Triage & Notification UI.
 * Features:
 * - SSE streaming: rows animate into the table one-by-one
 * - Candidate Picker modal for "Needs Review" rows
 * - Single-Click Sync: database update + bilingual email notification
 * - Live progress bar during extraction
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileImage,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Zap,
  Shield,
  RotateCcw,
  Eye,
  Phone,
  MapPin,
  User,
  Clock,
  Send,
  Check,
  Info,
  Bell,
  Mail,
  MessageCircle,
  Radio,
  Loader2,
  Search,
  Volume2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { MatchResult } from '@/lib/matching/patientMatcher';
import {
  useReconciliationStore,
  type RowAction,
  type ExtractedRowWithMatches,
} from '@/stores/useReconciliationStore';
import { BentoTriageCard } from './reconciliation/BentoTriageCard';

// ═══════════════════════════════════════════════════════
// Status Badges
// ═══════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'auto_match':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black tracking-wider">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          AUTO-MATCHED
        </Badge>
      );
    case 'needs_review':
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black tracking-wider">
          <Eye className="w-3 h-3 mr-1" />
          NEEDS REVIEW
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-black tracking-wider">
          <Plus className="w-3 h-3 mr-1" />
          NEW RECORD
        </Badge>
      );
  }
}

function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? 'bg-emerald-500' : pct >= 55 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold text-slate-500">
        {pct}%
      </span>
    </div>
  );
}

function ActionBadge({ action }: { action: RowAction }) {
  switch (action) {
    case 'accept':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-bold">
          ✅ Linked
        </Badge>
      );
    case 'create':
      return (
        <Badge className="bg-blue-100 text-blue-700 text-[9px] font-bold">
          ➕ New
        </Badge>
      );
    case 'reject':
      return (
        <Badge className="bg-slate-100 text-slate-500 text-[9px] font-bold">
          ❌ Skip
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 text-[9px] font-bold">
          ⏳ Pending
        </Badge>
      );
  }
}

// ═══════════════════════════════════════════════════════
// Upload Phase
// ═══════════════════════════════════════════════════════

function UploadPhase() {
  const {
    setFile,
    uploadedFile,
    imagePreviewUrl,
    startStreamExtraction,
    extractionError,
    clearFile,
    phase,
  } = useReconciliationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        setFile(file);
      } else {
        toast.error('Please upload an image file (JPEG, PNG, or WebP)');
      }
    },
    [setFile]
  );

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
          <FileImage className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Patient Triage & Notify
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          Upload a handwritten register page. AI extracts data row-by-row in
          real-time, matches against patients, and enables bilingual notifications.
        </p>
      </div>

      {!uploadedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            w-full max-w-lg h-64 border-2 border-dashed rounded-3xl cursor-pointer
            flex flex-col items-center justify-center gap-4 transition-all duration-300
            ${
              isDragOver
                ? 'border-violet-400 bg-violet-50 scale-[1.02]'
                : 'border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30'
            }
          `}
        >
          <Upload
            className={`w-10 h-10 transition-colors ${
              isDragOver ? 'text-violet-500' : 'text-slate-300'
            }`}
          />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">
              Drop register image here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              or click to browse · JPEG, PNG, WebP · Max 20 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setFile(file);
            }}
            className="hidden"
          />
        </div>
      ) : (
        <div className="w-full max-w-lg space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <img
              src={imagePreviewUrl!}
              alt="Register preview"
              className="w-full max-h-80 object-contain bg-slate-100"
            />
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <FileImage className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                {uploadedFile.name}
              </span>
            </div>
          </div>

          {extractionError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  Extraction Failed
                </p>
                <p className="text-xs text-red-500 mt-0.5">{extractionError}</p>
              </div>
            </div>
          )}

          <Button
            onClick={startStreamExtraction}
            disabled={phase === 'extracting' || phase === 'streaming'}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-widest py-6 rounded-2xl shadow-lg shadow-violet-200 transition-all"
          >
            {phase === 'extracting' ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin mr-2" />
                Initializing Gemini VLM...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 mr-2" />
                Stream Extract & Match
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Live Stream Progress Bar
// ═══════════════════════════════════════════════════════

function StreamProgressBar() {
  const { streamingProgress, rows, totalRows } = useReconciliationStore();

  return (
    <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-indigo-600" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">
            Live Streaming
          </span>
        </div>
        <span className="text-xs font-mono text-indigo-500">
          {rows.length}/{totalRows || '?'} rows
        </span>
      </div>
      <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
          animate={{ width: `${streamingProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1 text-emerald-600 font-bold">
          <CheckCircle2 className="w-3 h-3" />
          {rows.filter((r) => r.matchStatus === 'auto_match').length} matched
        </span>
        <span className="flex items-center gap-1 text-amber-600 font-bold">
          <Eye className="w-3 h-3" />
          {rows.filter((r) => r.matchStatus === 'needs_review').length} review
        </span>
        <span className="flex items-center gap-1 text-red-600 font-bold">
          <Plus className="w-3 h-3" />
          {rows.filter((r) => r.matchStatus === 'new_record').length} new
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Candidate Picker Modal
// ═══════════════════════════════════════════════════════

function CandidatePickerModal({
  row,
  onClose,
}: {
  row: ExtractedRowWithMatches;
  onClose: () => void;
}) {
  const { setDecision, decisions } = useReconciliationStore();
  const sno = row.sno ?? 0;
  const decision = decisions.get(sno);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', bounce: 0.15 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
              Candidate Picker
            </p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {row.name || 'Unknown Patient'}
            </h3>
            {row.father_name && (
              <p className="text-sm text-slate-400">S/O {row.father_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Extracted Data */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl">
          {row.age != null && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Age
              </p>
              <p className="text-sm font-bold">{row.age}</p>
            </div>
          )}
          {row.mobile && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Mobile
              </p>
              <p className="text-sm font-bold font-mono">{row.mobile}</p>
            </div>
          )}
          {row.ward && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Ward
              </p>
              <p className="text-sm font-bold">{row.ward}</p>
            </div>
          )}
        </div>

        {/* Phonetic Comparison Header */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-violet-500" />
          <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">
            Phonetic Similarity Analysis
          </p>
        </div>

        {/* Match Candidates */}
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {row.matches?.map((match: MatchResult) => {
              const isSelected =
                decision?.action === 'accept' &&
                decision?.selectedPatientId === match.patientId;

              return (
                <button
                  key={match.patientId}
                  onClick={() =>
                    setDecision(sno, {
                      action: 'accept',
                      selectedPatientId: match.patientId,
                    })
                  }
                  className={`
                    w-full text-left p-4 rounded-2xl border-2 transition-all duration-200
                    ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100'
                        : 'border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <span className="text-sm font-bold text-slate-900">
                        {match.patientName}
                      </span>
                    </div>
                    <ConfidenceMeter score={match.compositeScore} />
                  </div>

                  {/* Phonetic breakdown */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {match.metaphoneMatch && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        🔊 Sounds Like &quot;{row.name}&quot;
                      </span>
                    )}
                    {match.levenshteinDist <= 2 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        ✏️ {match.levenshteinDist} char diff
                      </span>
                    )}
                    {match.mobileExactMatch && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        📱 Mobile exact
                      </span>
                    )}
                    {match.ageDelta <= 3 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        🎂 Age ±{match.ageDelta}yr
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    {match.patientAge && <span>Age {match.patientAge}</span>}
                    {match.patientFacility && (
                      <span>{match.patientFacility}</span>
                    )}
                    {match.patientMobile && (
                      <span className="font-mono">{match.patientMobile}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDecision(sno, { action: 'create' });
              onClose();
            }}
            className="text-[10px] font-black uppercase tracking-widest rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create New Instead
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            disabled={decision?.action !== 'accept'}
            className="text-[10px] font-black uppercase tracking-widest rounded-xl ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Confirm Selection
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// Review Phase — Bento Triage Dashboard
// ═══════════════════════════════════════════════════════

function ReviewPhase() {
  const {
    rows,
    summary,
    latencyMs,
    modelVersion,
    autoDecideAll,
    submitReview,
    pendingCount,
    isReadyToSubmit,
    phase,
    imagePreviewUrl,
    extractionError,
    reset,
    streamingProgress,
  } = useReconciliationStore();

  const pending = pendingCount();
  const ready = isReadyToSubmit();
  const isStreaming = phase === 'streaming';

  // Counts derived from current rows for the live stat strip
  const autoCount = rows.filter(
    (r) => r.matchStatus === 'auto_match'
  ).length;
  const reviewCount = rows.filter(
    (r) => r.matchStatus === 'needs_review'
  ).length;
  const newCount = rows.filter(
    (r) => r.matchStatus === 'new_record' || !r.matchStatus
  ).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Streaming Progress ─────────────────────────── */}
      {isStreaming && <StreamProgressBar />}

      {/* ── Summary Header ─────────────────────────────── */}
      {!isStreaming && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Bento Triage Dashboard
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {summary && (
              <>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  🟢 {summary.autoMatch} Auto
                </Badge>
                <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold">
                  🟡 {summary.needsReview} Review
                </Badge>
                <Badge className="bg-violet-100 text-violet-700 text-[10px] font-bold">
                  🟣 {summary.newRecord} New
                </Badge>
              </>
            )}
            <Badge className="bg-slate-100 text-slate-500 text-[10px]">
              <Clock className="w-3 h-3 mr-1" />
              {latencyMs ? `${(latencyMs / 1000).toFixed(1)}s` : '—'}
            </Badge>
          </div>
        </div>
      )}

      {/* ── Two-Panel Layout ───────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Source Document */}
        {imagePreviewUrl && (
          <div className="hidden lg:block w-[240px] shrink-0">
            <div className="sticky top-0 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <img
                src={imagePreviewUrl}
                alt="Register"
                className="w-full object-contain max-h-[50vh] bg-slate-100"
              />
              <div className="p-2 bg-white/80 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Source · {modelVersion} · {rows.length} rows
                </p>
              </div>

              {/* Live Stat Strip */}
              <div className="p-3 space-y-2 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-emerald-600 font-bold">✅ {autoCount} matched</span>
                  <span className="text-amber-600 font-bold">⚡ {reviewCount} review</span>
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-violet-600 font-bold">🟣 {newCount} new</span>
                  <span className="text-slate-400 font-bold">⏳ {pending} pending</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right: Bento Grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={autoDecideAll}
              className="text-[10px] font-black uppercase tracking-widest rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Auto-Decide ({pending})
            </Button>
            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* ── BENTO GRID ──────────────────────────────── */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pr-2 pb-4">
              <AnimatePresence mode="popLayout">
                {rows.map((row, i) => (
                  <BentoTriageCard key={row.sno ?? i} row={row} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Error */}
          {extractionError && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-xs text-red-600 font-bold">
                {extractionError}
              </p>
            </div>
          )}

          {/* ── Submit Footer ──────────────────────────── */}
          {!isStreaming && (
            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <Button
                  onClick={submitReview}
                  disabled={!ready || phase === 'submitting'}
                  className={`
                    flex-1 font-black uppercase text-xs tracking-widest py-5 rounded-2xl
                    shadow-lg transition-all
                    ${
                      ready
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  {phase === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Committing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirm & Sync All
                      {pending > 0 && (
                        <span className="ml-2 text-[10px] opacity-70">
                          ({pending} pending)
                        </span>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Complete Phase
// ═══════════════════════════════════════════════════════

function CompletePhase() {
  const { submitResult, reset } = useReconciliationStore();
  if (!submitResult) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200"
      >
        <CheckCircle2 className="w-10 h-10 text-white" />
      </motion.div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900">
          Triage Complete
        </h2>
        <p className="text-sm text-slate-500">
          All decisions committed. Notifications dispatched.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        <Card className="p-4 text-center bg-emerald-50 border-emerald-100">
          <p className="text-3xl font-black text-emerald-700">
            {submitResult.accepted}
          </p>
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">
            Linked
          </p>
        </Card>
        <Card className="p-4 text-center bg-blue-50 border-blue-100">
          <p className="text-3xl font-black text-blue-700">
            {submitResult.created}
          </p>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
            Created
          </p>
        </Card>
        <Card className="p-4 text-center bg-slate-50 border-slate-100">
          <p className="text-3xl font-black text-slate-500">
            {submitResult.rejected}
          </p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Rejected
          </p>
        </Card>
      </div>

      {submitResult.errors.length > 0 && (
        <div className="w-full max-w-md p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
          <p className="text-xs font-black text-red-700 uppercase tracking-widest">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            {submitResult.errors.length} Error
            {submitResult.errors.length !== 1 ? 's' : ''}
          </p>
          {submitResult.errors.map((err) => (
            <p key={err.sno} className="text-[11px] text-red-500">
              Row {err.sno}: {err.error}
            </p>
          ))}
        </div>
      )}

      <Button
        onClick={reset}
        variant="outline"
        className="font-black uppercase text-xs tracking-widest rounded-xl"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Process Another Register
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════

export function RegisterReconciliation() {
  const { phase } = useReconciliationStore();

  return (
    <div className="h-full flex flex-col">
      {(phase === 'upload' || phase === 'extracting') && <UploadPhase />}
      {(phase === 'streaming' || phase === 'review' || phase === 'submitting') && (
        <ReviewPhase />
      )}
      {phase === 'complete' && <CompletePhase />}
    </div>
  );
}
