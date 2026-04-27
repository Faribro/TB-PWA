'use client';

/**
 * RegisterReconciliation.tsx
 *
 * Date-scoped reconciliation review UI.
 * Shows extracted rows with match explanations, context banner,
 * and clear action outcomes.
 *
 * Supports both:
 * - New scoped format (matchResults with ScoredCandidate[])
 * - Legacy format (ExtractedRowWithMatches)
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, AlertCircle, Plus, Eye, RotateCcw,
  Phone, User, Calendar, Building2, MapPin, Shield,
  ArrowRight, ChevronDown, AlertTriangle, FileWarning,
  Zap, Check, Loader2, FileSpreadsheet, Clock,
} from 'lucide-react';
import { useSWRConfig } from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useReconciliationStore,
  type RowAction,
} from '@/stores/useReconciliationStore';
import type { RowMatchResult, ScoredCandidate } from '@/lib/reconciliation/sessionTypes';

// ═══════════════════════════════════════════════════════
// Format Helpers
// ═══════════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════════
// Status Badges
// ═══════════════════════════════════════════════════════

function ClassificationBadge({ classification }: { classification: string }) {
  switch (classification) {
    case 'auto_match':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold tracking-wide">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          MATCHED
        </Badge>
      );
    case 'needs_review':
      return (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold tracking-wide">
          <Eye className="w-3 h-3 mr-1" />
          REVIEW
        </Badge>
      );
    case 'duplicate_in_file':
      return (
        <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold tracking-wide">
          <FileWarning className="w-3 h-3 mr-1" />
          DUPLICATE
        </Badge>
      );
    case 'duplicate_in_scope':
      return (
        <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-bold tracking-wide">
          <AlertTriangle className="w-3 h-3 mr-1" />
          EXISTS
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold tracking-wide">
          <Plus className="w-3 h-3 mr-1" />
          NEW
        </Badge>
      );
  }
}

function ActionBadge({ action }: { action: RowAction }) {
  switch (action) {
    case 'accept':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-bold">
          ✅ Link
        </Badge>
      );
    case 'create':
      return (
        <Badge className="bg-blue-100 text-blue-700 text-[9px] font-bold">
          ➕ Create
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

// ═══════════════════════════════════════════════════════
// Match Reason Chips
// ═══════════════════════════════════════════════════════

function MatchReasonChips({ reasons }: { reasons: string[] }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reasons.map((reason, i) => (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50"
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Context Banner
// ═══════════════════════════════════════════════════════

function ScopeContextBanner() {
  const { selectedDate, facilityName, screeningDistrict, screeningState, scopeMode } =
    useReconciliationStore();

  if (!selectedDate) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
      <Zap className="w-4 h-4 shrink-0" />
      <div className="flex-1 flex items-center gap-3 flex-wrap text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 opacity-70" />
          {formatDate(selectedDate)}
        </span>
        {facilityName && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 opacity-70" />
            {facilityName}
          </span>
        )}
        {(screeningDistrict || screeningState) && (
          <span className="flex items-center gap-1.5 opacity-80">
            <MapPin className="w-3.5 h-3.5" />
            {[screeningDistrict, screeningState].filter(Boolean).join(', ')}
          </span>
        )}
      </div>
      <Badge
        variant="outline"
        className="border-white/30 text-white text-[9px] font-bold shrink-0"
      >
        {scopeMode === 'date_facility' ? 'Facility Scoped' : 'Date Scoped'}
      </Badge>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Candidate Picker Modal
// ═══════════════════════════════════════════════════════

function CandidatePickerModal({
  result,
  onClose,
}: {
  result: RowMatchResult;
  onClose: () => void;
}) {
  const { setDecision, decisions } = useReconciliationStore();
  const sno = result.sno;
  const decision = decisions.get(sno);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', bounce: 0.15 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-5 max-h-[80vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
              Select Best Match
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              {result.extractedRow.name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {result.extractedRow.age && (
                <span>Age: {result.extractedRow.age}</span>
              )}
              {result.extractedRow.mobile && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {result.extractedRow.mobile}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Candidates */}
        <div className="space-y-2">
          {result.candidates.length > 0 ? (
            result.candidates.map((candidate) => {
              const isSelected = decision?.selectedPatientId === candidate.patientId;
              return (
                <motion.button
                  key={candidate.patientId}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setDecision(sno, {
                      action: 'accept',
                      selectedPatientId: candidate.patientId,
                    });
                  }}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-white',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-800">
                      {candidate.patientName}
                    </span>
                    <ConfidenceMeter score={candidate.compositeScore} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {candidate.patientAge && <span>Age: {candidate.patientAge}</span>}
                    {candidate.patientMobile && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {candidate.patientMobile}
                      </span>
                    )}
                    {candidate.patientFacility && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3" />
                        {candidate.patientFacility}
                      </span>
                    )}
                  </div>
                  <MatchReasonChips reasons={candidate.matchReasons} />
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      Selected
                    </div>
                  )}
                </motion.button>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No candidates found in scope
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg font-semibold text-xs border-gray-200"
            onClick={() => {
              setDecision(sno, { action: 'create' });
              onClose();
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create New
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg font-semibold text-xs text-gray-500 border-gray-200"
            onClick={() => {
              setDecision(sno, { action: 'reject' });
              onClose();
            }}
          >
            Skip
          </Button>
          {decision?.action === 'accept' && (
            <Button
              size="sm"
              className="flex-1 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onClose}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Confirm
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// Review Phase — Scoped Results
// ═══════════════════════════════════════════════════════

type FilterView = 'all' | 'matched' | 'review' | 'new' | 'duplicate';

function ReviewPhase() {
  const {
    matchResults,
    rows,
    decisions,
    setDecision,
    autoDecideAll,
    submitReview,
    phase,
    selectedDate,
    facilityName,
    scopedSummary,
    summary,
    reset,
    setIsReviewOpen,
  } = useReconciliationStore();

  const [pickerResult, setPickerResult] = useState<RowMatchResult | null>(null);
  const { mutate } = useSWRConfig();

  // Use scoped results if available, else fall back to legacy rows
  const isScoped = matchResults.length > 0;
  const displaySummary = scopedSummary ?? summary;
  const isEmptyScope = scopedSummary?.isEmptyScope === true;

  // Split results into Existing (matched/needs_review) and New (new_record)
  const { existingInmates, newInmates } = useMemo(() => {
    if (!isScoped) return { existingInmates: [], newInmates: [] };
    
    const existing = matchResults.filter((r) => 
      r.classification === 'auto_match' || r.classification === 'needs_review'
    );
    const newRecs = matchResults.filter((r) => 
      r.classification === 'new_record'
    );
    
    return { existingInmates: existing, newInmates: newRecs };
  }, [matchResults, isScoped]);

  // Stats
  const totalResults = isScoped ? matchResults.length : rows.length;
  const decidedCount = (() => {
    let count = 0;
    decisions.forEach((d) => {
      if (d.action !== 'pending') count++;
    });
    return count;
  })();
  const isAllDecided = decidedCount >= totalResults && totalResults > 0;

  const handleClose = () => {
    setIsReviewOpen(false);
    reset();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Register Reconciliation
            </h2>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {selectedDate ? formatDate(selectedDate) : 'No date'}
              </span>
              {facilityName && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {facilityName}
                  </span>
                </>
              )}
              <span className="text-gray-300">·</span>
              <span>{decidedCount}/{totalResults} decided</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats Pills */}
          {displaySummary && (
            <div className="flex items-center gap-2 mr-4">
              {scopedSummary?.scopedCandidateCount != null && scopedSummary.scopedCandidateCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                  <User className="w-3.5 h-3.5" />
                  {scopedSummary.scopedCandidateCount} in scope
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {displaySummary.autoMatch} matched
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                <Eye className="w-3.5 h-3.5" />
                {displaySummary.needsReview} review
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                <Plus className="w-3.5 h-3.5" />
                {displaySummary.newRecord} new
              </div>
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Empty Scope State or Two-Column Layout */}
      {isEmptyScope ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <Calendar className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">No Inmates Found for This Day</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                No inmates have been found for{' '}
                <span className="font-semibold text-gray-700">
                  {selectedDate ? formatDate(selectedDate) : 'this date'}
                </span>
                {facilityName && (
                  <> at <span className="font-semibold text-gray-700">{facilityName}</span></>
                )}.
                The uploaded register contains <span className="font-semibold text-blue-600">{newInmates.length}</span> new entries
                that will be created as fresh records for this date.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">What happens next</p>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <Plus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  All {newInmates.length} rows will be created as new patient records
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Screening date will be set to <strong>{selectedDate ? formatDate(selectedDate) : 'selected date'}</strong>
                </li>
                <li className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {facilityName ? `Facility: ${facilityName}` : 'No facility specified'}
                </li>
              </ul>
            </div>
            <Button
              onClick={autoDecideAll}
              className="h-11 px-8 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-decide All as New Records
            </Button>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Existing Inmates Column */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Existing Inmates</h3>
              <span className="text-xs text-gray-500">({existingInmates.length})</span>
            </div>
            <button
              onClick={autoDecideAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Auto-decide
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {existingInmates.length > 0 ? (
                existingInmates.map((result) => (
                  <ScopedRowCard
                    key={result.sno}
                    result={result}
                    decision={decisions.get(result.sno)}
                    onSetDecision={(action, patientId) =>
                      setDecision(result.sno, { action, selectedPatientId: patientId })
                    }
                    onOpenPicker={() => setPickerResult(result)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No existing inmates to match</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: New Inmates Column */}
        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-100/50 flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">New Inmates</h3>
            <span className="text-xs text-gray-500">({newInmates.length})</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {newInmates.length > 0 ? (
                newInmates.map((result) => (
                  <ScopedRowCard
                    key={result.sno}
                    result={result}
                    decision={decisions.get(result.sno)}
                    onSetDecision={(action, patientId) =>
                      setDecision(result.sno, { action, selectedPatientId: patientId })
                    }
                    onOpenPicker={() => setPickerResult(result)}
                    isNewInmate
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Plus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No new inmates to create</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      )}

      {/* Bottom Action Bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{decidedCount}</span> of <span className="font-semibold text-gray-900">{totalResults}</span> records decided
          </div>

          <Button
            onClick={async () => {
              await submitReview();
              mutate((key: any) =>
                Array.isArray(key) &&
                (key[0] === 'patients' || key[0] === 'allPatients' || key[0] === '/api/patients')
              );
            }}
            disabled={!isAllDecided || phase === 'submitting' || totalResults === 0}
            className={cn(
              'h-11 px-8 rounded-xl font-bold text-sm uppercase tracking-wide transition-all',
              isAllDecided && totalResults > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            )}
          >
            {phase === 'submitting' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Commit {decidedCount} Records
          </Button>
        </div>
      </div>

      {/* Candidate Picker Modal */}
      <AnimatePresence>
        {pickerResult && (
          <CandidatePickerModal
            result={pickerResult}
            onClose={() => setPickerResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Scoped Row Card (NEW format)
// ═══════════════════════════════════════════════════════

function ScopedRowCard({
  result,
  decision,
  onSetDecision,
  onOpenPicker,
  isNewInmate = false,
}: {
  result: RowMatchResult;
  decision: { action: RowAction; selectedPatientId?: string } | undefined;
  onSetDecision: (action: RowAction, patientId?: string) => void;
  onOpenPicker: () => void;
  isNewInmate?: boolean;
}) {
  const row = result.extractedRow;
  const topCandidate = result.candidates[0];
  const action = decision?.action ?? 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4 transition-all shadow-sm',
        action === 'accept' ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100' :
        action === 'create' ? 'bg-blue-50 border-blue-200 shadow-blue-100' :
        action === 'reject' ? 'bg-gray-100 border-gray-200 opacity-60' :
        'bg-white border-gray-200 hover:border-gray-300',
      )}
    >
      {/* Row header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              #{result.sno}
            </span>
            <ClassificationBadge classification={result.classification} />
            <ActionBadge action={action} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {row.name || 'Unknown'}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {row.age && <span>Age: {row.age}</span>}
            {row.mobile && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {row.mobile}
              </span>
            )}
            {row.father_name && (
              <span className="truncate">S/O {row.father_name}</span>
            )}
          </div>
          {row.isDuplicateInFile && (
            <p className="text-[10px] text-purple-600 mt-1">
              ⚠ Duplicate of row #{row.duplicateOfSno}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {result.classification !== 'duplicate_in_file' && (
            <>
              {!isNewInmate && (
                <button
                  onClick={() => {
                    if (topCandidate) {
                      onSetDecision('accept', topCandidate.patientId);
                    } else {
                      onOpenPicker();
                    }
                  }}
                  title="Link to existing"
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                    action === 'accept'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600',
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onSetDecision('create')}
                title="Create new patient"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  action === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600',
                )}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSetDecision('reject')}
                title="Skip this row"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  action === 'reject'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600',
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Best candidate preview - only for existing inmates */}
      {!isNewInmate && topCandidate && result.classification !== 'duplicate_in_file' && (
        <button
          onClick={onOpenPicker}
          className="w-full mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
              {topCandidate.patientName}
            </span>
            <ConfidenceMeter score={topCandidate.compositeScore} />
          </div>
          <MatchReasonChips reasons={topCandidate.matchReasons} />
          {result.candidates.length > 1 && (
            <p className="text-[10px] text-gray-500 mt-1">
              +{result.candidates.length - 1} more candidate(s) →
            </p>
          )}
        </button>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// Legacy Row Card (SSE/OCR format)
// ═══════════════════════════════════════════════════════

function LegacyRowCard({
  row,
  decision,
  onSetDecision,
}: {
  row: any;
  decision: { action: RowAction; selectedPatientId?: string } | undefined;
  onSetDecision: (action: RowAction, patientId?: string) => void;
}) {
  const action = decision?.action ?? 'pending';
  const topMatch = row.matches?.[0];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all shadow-sm',
        action === 'accept' ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100' :
        action === 'create' ? 'bg-blue-50 border-blue-200 shadow-blue-100' :
        action === 'reject' ? 'bg-gray-100 border-gray-200 opacity-60' :
        'bg-white border-gray-200 hover:border-gray-300',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{row.sno}</span>
            <ClassificationBadge classification={row.matchStatus || 'new_record'} />
            <ActionBadge action={action} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 truncate">{row.name || 'Unknown'}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {row.age && <span>Age: {row.age}</span>}
            {row.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{row.mobile}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (topMatch) onSetDecision('accept', topMatch.patientId);
            }}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
              action === 'accept' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600',
            )}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSetDecision('create')}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
              action === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600',
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSetDecision('reject')}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
              action === 'reject' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600',
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {topMatch && (
        <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500">
          <span className="text-gray-700 font-semibold">{topMatch.patientName}</span>
          {' · '}
          <span className="text-[10px]">{topMatch.matchReason}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Complete Phase
// ═══════════════════════════════════════════════════════

function CompletePhase() {
  const { submitResult, reset, selectedDate } = useReconciliationStore();
  if (!submitResult) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-12 bg-gray-50 h-full justify-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <CheckCircle2 className="w-10 h-10 text-white" />
      </motion.div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Reconciliation Complete
        </h2>
        <p className="text-sm text-gray-500">
          {selectedDate && (
            <>Screening date: <span className="text-gray-700 font-semibold">{formatDate(selectedDate)}</span> · </>
          )}
          All decisions committed.
        </p>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <Card className="p-4 text-center bg-emerald-50 border-emerald-200 shadow-sm">
          <p className="text-3xl font-bold text-emerald-600">{submitResult.accepted}</p>
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">Linked</p>
        </Card>
        <Card className="p-4 text-center bg-blue-50 border-blue-200 shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{submitResult.created}</p>
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mt-1">Created</p>
        </Card>
        <Card className="p-4 text-center bg-gray-50 border-gray-200 shadow-sm">
          <p className="text-3xl font-bold text-gray-600">{submitResult.rejected}</p>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">Skipped</p>
        </Card>
      </div>

      {/* Duplicates Skipped */}
      {(submitResult.duplicatesSkipped ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
          <FileWarning className="w-3.5 h-3.5" />
          {submitResult.duplicatesSkipped} duplicate(s) skipped during insert
        </div>
      )}

      {/* Sheets sync status */}
      {submitResult.dbCommitted && (
        <div className="space-y-2 w-full max-w-md">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Database commit successful
          </div>

          {submitResult.sheetsTriggered && !submitResult.sheetsError && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Google Sheets sync triggered
            </div>
          )}

          {submitResult.sheetsError && (
            <div className="flex items-start gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Google Sheets sync failed</p>
                <p className="text-amber-600/70 mt-0.5">{submitResult.sheetsError}</p>
                <p className="text-amber-600/50 mt-1">Data is saved in the database. Sheets will sync on next scheduled run.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {submitResult.errors.length > 0 && (
        <div className="w-full max-w-md p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            {submitResult.errors.length} Error{submitResult.errors.length !== 1 ? 's' : ''}
          </p>
          {submitResult.errors.map((err) => (
            <p key={err.sno} className="text-[11px] text-red-600">
              Row {err.sno}: {err.error}
            </p>
          ))}
        </div>
      )}

      <Button
        onClick={reset}
        variant="outline"
        className="font-semibold uppercase text-xs tracking-widest rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Process Another Register
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Upload Phase (Legacy — for direct OCR/SSE flow)
// ═══════════════════════════════════════════════════════

function UploadPhase() {
  const { phase } = useReconciliationStore();
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-400 py-12">
      <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-sm font-semibold text-gray-500">
        {phase === 'extracting' ? 'Processing...' : 'Waiting for upload from Vertex...'}
      </p>
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
      {(phase === 'upload' || phase === 'extracting' || phase === 'streaming') && <UploadPhase />}
      {(phase === 'review' || phase === 'submitting') && <ReviewPhase />}
      {phase === 'complete' && <CompletePhase />}
    </div>
  );
}
