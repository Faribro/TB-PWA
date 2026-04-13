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
      ? 'border-violet-400/60 bg-white shadow-[0_0_20px_rgba(139,92,246,0.15),0_4px_20px_-4px_rgba(139,92,246,0.3)]'
      : confidenceTier === 'high'
        ? 'border-emerald-400/60 bg-white shadow-[0_0_15px_rgba(16,185,129,0.1),0_4px_15px_-4px_rgba(16,185,129,0.2)]'
        : confidenceTier === 'medium'
        ? 'border-amber-400/60 bg-white shadow-[0_0_15px_rgba(245,158,11,0.1),0_4px_15px_-4px_rgba(245,158,11,0.2)]'
        : 'border-slate-200/60 bg-white shadow-sm';

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
      className={`relative bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${cardBorderClass}`}
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
      
      <div className="grid grid-cols-[20px_1fr_auto] gap-3 pl-3">
        {/* Row number */}
        <div className="flex items-center">
          <span className="text-xs font-bold text-slate-500">
            {row.sno ?? '?'}
          </span>
        </div>
        
        {/* Main content */}
        <div className="space-y-2">
          {/* Row 1: Name + Status badges */}
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">
              {row.name || 'Illegible'}
            </h3>
            {row.father_name && (
              <span className="text-xs text-slate-400">S/O {row.father_name}</span>
            )}
            {matchStatus === 'new_record' && (
              <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-black tracking-[0.1em] px-2 py-0.5">
                NEW
              </Badge>
            )}
            {matchStatus === 'auto_match' && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black tracking-[0.1em] px-2 py-0.5">
                MATCH
              </Badge>
            )}
            {matchStatus === 'needs_review' && (
              <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black tracking-[0.1em] px-2 py-0.5">
                REVIEW
              </Badge>
            )}
          </div>
          
          {/* Row 2: Extracted data */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {row.age != null && (
              <span>{row.age} yrs</span>
            )}
            {row.mobile && (
              <span className="font-mono">{row.mobile}</span>
            )}
            {row.ward && (
              <span>{row.ward}</span>
            )}
            <span className="text-slate-400">• Extracted</span>
          </div>

          {/* Preprocessing telemetry for image sources */}
          {source === 'image' && preprocessing && (
            <div className="text-[10px] text-slate-500 mt-1">
              Profile: {preprocessing.profile} ·
              {preprocessing.scaleFactor > 1
                ? ` ${preprocessing.scaleFactor.toFixed(1)}x upscaled ·`
                : ''}
              Pass {preprocessing.passUsed} ·
              {preprocessing.processingMs}ms
            </div>
          )}
          
          {/* Row 3: Match info */}
          {topMatch && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-indigo-600 font-semibold">{topMatch.patientName}</span>
              {topMatch.patientAge && <span>{topMatch.patientAge} yrs</span>}
              {topMatch.patientMobile && <span className="font-mono">{topMatch.patientMobile}</span>}
              <span className="text-slate-400">• Database</span>
            </div>
          )}
        </div>
        
        {/* Right column: Actions */}
        <div className="flex flex-col items-end gap-1.5">
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
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700">Synced</span>
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
            className="mt-3 pt-3 border-t border-slate-100 space-y-2 overflow-hidden"
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
    </motion.div>
  );
}
