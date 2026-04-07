'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Plus,
  User,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  Send,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { ExtractedRowWithMatches } from '@/stores/useReconciliationStore';
import { useReconciliationStore } from '@/stores/useReconciliationStore';
import { ConfidenceGauge } from './ConfidenceGauge';
import type { MatchResult } from '@/lib/matching/patientMatcher';

interface BentoTriageCardProps {
  row: ExtractedRowWithMatches;
  index: number;
}

export function BentoTriageCard({ row, index }: BentoTriageCardProps) {
  const { decisions, setDecision, confirmAndNotify } = useReconciliationStore();
  const [notifying, setNotifying] = useState(false);
  const [merging, setMerging] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);

  const sno = row.sno ?? index;
  const decision = decisions.get(sno);
  const currentAction = decision?.action ?? 'pending';
  const matchStatus = row.matchStatus || 'new_record';
  const topMatch = row.matches?.[0];
  const hasMultipleCandidates = (row.matches?.length ?? 0) > 1;

  const handleConfirmMatch = async (match: MatchResult) => {
    setMerging(true);
    setDecision(sno, {
      action: 'accept',
      selectedPatientId: match.patientId,
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    setMerging(false);
    toast.success(`Linked to ${match.patientName}`);
  };

  const handleCreateNew = () => {
    setDecision(sno, { action: 'create' });
    toast.success('Marked as new patient');
  };

  const handleSingleClickSync = async () => {
    setNotifying(true);
    await confirmAndNotify(sno);
    toast.success(`Row ${sno}: Synced to database`);
    setNotifying(false);
  };

  // Confidence tier styling
  const confidenceTier =
    topMatch?.compositeScore >= 0.85
      ? 'high'
      : topMatch?.compositeScore >= 0.55
        ? 'medium'
        : 'low';

  const cardBorderClass =
    matchStatus === 'new_record'
      ? 'border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/30'
      : confidenceTier === 'high'
        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-teal-50/20'
        : confidenceTier === 'medium'
        ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-yellow-50/20'
        : 'border-slate-200 bg-white';

  const glowClass =
    matchStatus === 'new_record'
      ? 'shadow-lg shadow-violet-100'
      : confidenceTier === 'high'
        ? 'shadow-md shadow-emerald-100'
        : confidenceTier === 'medium'
        ? 'shadow-md shadow-amber-100'
        : 'shadow-sm';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`relative rounded-3xl border-2 p-5 space-y-4 transition-all duration-300 hover:scale-[1.02] ${cardBorderClass} ${glowClass}`}
    >
      {/* Header: S.No + Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black">
            {row.sno ?? '?'}
          </div>
          {matchStatus === 'new_record' && (
            <Badge className="bg-violet-500/10 text-violet-700 border border-violet-500/20 text-[9px] font-black tracking-wider">
              🟣 NEW INMATE
            </Badge>
          )}
          {matchStatus === 'auto_match' && (
            <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[9px] font-black tracking-wider">
              ✅ AUTO
            </Badge>
          )}
          {matchStatus === 'needs_review' && (
            <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[9px] font-black tracking-wider">
              ⚡ REVIEW
            </Badge>
          )}
        </div>
        {currentAction !== 'pending' && (
          <Badge
            className={`text-[9px] font-bold ${
              currentAction === 'accept'
                ? 'bg-emerald-100 text-emerald-700'
                : currentAction === 'create'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {currentAction === 'accept'
              ? '✅ Linked'
              : currentAction === 'create'
                ? '➕ New'
                : '❌ Skip'}
          </Badge>
        )}
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left: Extracted Scan Data */}
        <motion.div
          animate={merging ? { x: 100, opacity: 0 } : { x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-2 p-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100"
        >
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            📄 Extracted Scan
          </p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {row.name || 'Illegible'}
                </p>
                {row.father_name && (
                  <p className="text-[10px] text-slate-400 truncate">
                    S/O {row.father_name}
                  </p>
                )}
              </div>
            </div>
            {row.age != null && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-600">{row.age} yrs</p>
              </div>
            )}
            {row.mobile && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs font-mono text-slate-600">{row.mobile}</p>
              </div>
            )}
            {row.ward && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-xs text-slate-600 truncate">{row.ward}</p>
              </div>
            )}
          </div>
          <ConfidenceGauge score={row.confidence_score} label="OCR" />
        </motion.div>

        {/* Right: Suggested Database Patient */}
        <motion.div
          animate={merging ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-2 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-violet-50/30 border border-indigo-100"
        >
          {topMatch ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                  🎯 Database Match
                </p>
                {hasMultipleCandidates && (
                  <button
                    onClick={() => setShowCandidates(!showCandidates)}
                    className="text-[9px] font-bold text-violet-600 hover:text-violet-700 underline"
                  >
                    {showCandidates ? 'Hide' : `+${row.matches.length - 1}`}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-indigo-900 leading-tight truncate">
                      {topMatch.patientName}
                    </p>
                  </div>
                </div>
                {topMatch.patientAge && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-xs text-indigo-700">
                      {topMatch.patientAge} yrs
                    </p>
                  </div>
                )}
                {topMatch.patientMobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-xs font-mono text-indigo-700">
                      {topMatch.patientMobile}
                    </p>
                  </div>
                )}
                {topMatch.patientFacility && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-xs text-indigo-700 truncate">
                      {topMatch.patientFacility}
                    </p>
                  </div>
                )}
              </div>
              <ConfidenceGauge
                score={topMatch.compositeScore}
                label="Match"
                tier={confidenceTier}
              />
              {/* Match Reason */}
              <div className="flex items-start gap-1.5 p-2 bg-white/60 rounded-lg">
                <Volume2 className="w-3 h-3 text-violet-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-600 leading-relaxed">
                  {topMatch.matchReason}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-4 text-center">
              <Sparkles className="w-6 h-6 text-violet-400 mb-2" />
              <p className="text-xs font-bold text-violet-700">
                No Match Found
              </p>
              <p className="text-[10px] text-violet-500 mt-1">
                Potential new inmate
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Additional Candidates (Expandable) */}
      <AnimatePresence>
        {showCandidates && row.matches && row.matches.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Alternative Candidates
            </p>
            {row.matches.slice(1).map((match) => (
              <button
                key={match.patientId}
                onClick={() => handleConfirmMatch(match)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-900">
                    {match.patientName}
                  </p>
                  <ConfidenceGauge score={match.compositeScore} label="" />
                </div>
                <p className="text-[9px] text-slate-500">{match.matchReason}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Bar ─────────────────────────────────── */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        {/* Pending: Primary + Secondary CTAs */}
        {currentAction === 'pending' && (
          <div className="flex items-center gap-2">
            {/* Reject — pushed left, muted (industry: destructive far-left) */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDecision(sno, { action: 'reject' });
                toast('Skipped', { icon: '⏭️' });
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest rounded-xl px-3"
            >
              Skip
            </Button>

            <div className="flex-1" />

            {/* Create New — secondary, left of primary */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateNew}
              className="text-[10px] font-black uppercase tracking-widest rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create New
            </Button>

            {/* Confirm Match — primary CTA, right-aligned, glowing */}
            {topMatch && (
              <Button
                size="sm"
                onClick={() => handleConfirmMatch(topMatch)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] transition-shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Confirm Match
              </Button>
            )}
          </div>
        )}

        {/* Post-decision: Sync & Notify bar */}
        {currentAction !== 'pending' && !decision?.notified && (
          <Button
            size="sm"
            onClick={handleSingleClickSync}
            disabled={notifying}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-indigo-200 py-2.5"
          >
            {notifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Syncing to Database…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Single-Click Sync & Notify
              </>
            )}
          </Button>
        )}

        {/* Synced confirmation */}
        {decision?.notified && (
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              Synced & Notified
            </span>
          </div>
        )}
      </div>

      {/* Merge Animation Overlay */}
      <AnimatePresence>
        {merging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-3xl flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-300"
            >
              <ArrowRight className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
