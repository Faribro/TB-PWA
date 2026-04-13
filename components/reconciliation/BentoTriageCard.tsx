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
  source: string;
  preprocessing: {
    applied: boolean;
    profile: string;
    scaleFactor: number;
    passUsed: 1 | 2;
    processingMs: number;
  } | null;
}

export default function BentoTriageCard({ row, index, source, preprocessing }: BentoTriageCardProps) {
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
      ? 'border-violet-400/60 !bg-slate-900 shadow-[0_0_20px_rgba(139,92,246,0.15),0_4px_20px_-4px_rgba(139,92,246,0.3)]'
      : confidenceTier === 'high'
        ? 'border-emerald-400/60 !bg-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.1),0_4px_15px_-4px_rgba(16,185,129,0.2)]'
        : confidenceTier === 'medium'
        ? 'border-amber-400/60 !bg-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.1),0_4px_15px_-4px_rgba(245,158,11,0.2)]'
        : 'border-slate-200/60 !bg-slate-900 shadow-sm';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`relative !bg-slate-900 border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${cardBorderClass}`}
    >
      {/* Left accent bar */}
      <div 
        className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${
          matchStatus === 'new_record' ? 'bg-violet-500' : 
          confidenceTier === 'high' ? 'bg-emerald-500' : 
          confidenceTier === 'medium' ? 'bg-amber-500' : 
          'bg-transparent'
        }`}
      />
      
      <div className="flex flex-col gap-3 pl-3 w-full min-w-0">
        {/* Header: Name prominently displayed */}
        <div className="flex items-start justify-between gap-3 w-full min-w-0">
          <div className="flex-1 min-w-0 overflow-visible">
            {/* Patient Name - Large and prominent with full visibility */}
            <h3 className="text-xl font-bold text-white leading-snug whitespace-normal overflow-visible">
              {row.name || 'Illegible'}
            </h3>
            
            {/* Father's name if available */}
            {row.father_name && (
              <p className="text-sm text-slate-400 mt-0.5">
                S/O {row.father_name}
              </p>
            )}
          </div>
          
          {/* Status badges */}
          <div className="flex-shrink-0">
            {matchStatus === 'new_record' && (
              <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-black tracking-[0.1em] px-2.5 py-1">
                NEW
              </Badge>
            )}
            {matchStatus === 'auto_match' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-[0.1em] px-2.5 py-1">
                MATCH
              </Badge>
            )}
            {matchStatus === 'needs_review' && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black tracking-[0.1em] px-2.5 py-1">
                REVIEW
              </Badge>
            )}
          </div>
        </div>
        
        {/* Patient Details Grid */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
          {/* Age */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 uppercase">Age</span>
            <span className="font-bold text-slate-200">
              {row.age ?? '—'}
            </span>
          </div>
          
          {/* Mobile */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 uppercase">Mobile</span>
            <span className="font-mono font-bold text-slate-200">
              {row.mobile || 'Not found'}
            </span>
          </div>
          
          {/* Confidence */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 uppercase">Confidence</span>
            <span className={`font-bold ${
              (row.confidence_score ?? 0) >= 0.8
                ? 'text-emerald-400'
                : (row.confidence_score ?? 0) >= 0.6
                ? 'text-amber-400'
                : 'text-red-400'
            }`}>
              {Math.round((row.confidence_score ?? 0) * 100)}%
            </span>
          </div>
        </div>

        {/* Preprocessing telemetry for image sources */}
        {source === 'image' && preprocessing && (
          <div className="text-[11px] text-slate-400 bg-slate-800 rounded-md px-2 py-1.5 inline-flex items-center gap-2 w-fit">
            <Sparkles className="w-3 h-3" />
            <span>Profile: {preprocessing.profile}</span>
            {preprocessing.scaleFactor > 1 && (
              <span>· {preprocessing.scaleFactor.toFixed(1)}x upscaled</span>
            )}
            <span>· Pass {preprocessing.passUsed}</span>
            <span>· {preprocessing.processingMs}ms</span>
          </div>
        )}
        
        {/* Match info with database result */}
        {topMatch && (
          <div className="bg-indigo-900/30 rounded-lg p-3 border border-indigo-500/30">
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
              Database Match ({Math.round(topMatch.compositeScore * 100)}% confidence)
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-indigo-300">{topMatch.patientName}</span>
              {topMatch.patientAge && (
                <span className="text-slate-400">{topMatch.patientAge} yrs</span>
              )}
              {topMatch.patientMobile && (
                <span className="font-mono text-slate-400">{topMatch.patientMobile}</span>
              )}
              {topMatch.patientFacility && (
                <span className="text-slate-500">{topMatch.patientFacility}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Action buttons row */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
          {/* Confidence badge */}
          {topMatch && (
            <span className="h-[26px] px-2.5 flex items-center rounded-md text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/30">
              {Math.round(topMatch.compositeScore * 100)}%
            </span>
          )}
          
          {/* Action buttons */}
          {currentAction === 'pending' && (
            <div className="flex items-center gap-1">
              {topMatch && (
                <Button
                  size="sm"
                  onClick={() => handleConfirmMatch(topMatch)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-md h-8 px-3"
                >
                  <CheckCircle2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleCreateNew}
                variant="outline"
                className="text-[10px] font-black uppercase tracking-widest rounded-md border-violet-200 text-violet-700 hover:bg-violet-50 h-8 px-3"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {/* Synced confirmation */}
          {decision?.notified && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 rounded-md border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">Synced</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Additional candidates (expandable) */}
      <AnimatePresence>
        {showCandidates && row.matches && row.matches.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 pt-3 border-t border-slate-700 space-y-2 overflow-hidden"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Alternative Candidates
            </p>
            {row.matches.slice(1).map((match) => (
              <button
                key={match.patientId}
                onClick={() => handleConfirmMatch(match)}
                className="w-full text-left p-3 rounded-xl border border-slate-700 bg-slate-800 hover:border-indigo-500 hover:bg-indigo-900/20 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-200">
                    {match.patientName}
                  </p>
                  <ConfidenceGauge score={match.compositeScore} label="" />
                </div>
                <p className="text-[9px] text-slate-400">{match.matchReason}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
