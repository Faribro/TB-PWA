'use client';

import { motion } from 'framer-motion';
import { Search, AlertCircle, ArrowRightCircle, Activity, Pill, ClipboardList, CheckCircle2, Check } from 'lucide-react';

interface ClinicalTimelineProps {
  screeningDate?: string | null;
  xrayResult?: string | null;
  symptoms10s?: string | null;
  referralDate?: string | null;
  referredFacility?: string | null;
  tbDiagnosed?: string | null;
  diagnosisDate?: string | null;
  attStartDate?: string | null;
  nikshayId?: string | null;
  treatmentCompletionDate?: string | null;
  closureReason?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

interface TimelineNode {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  status: 'complete' | 'active' | 'pending' | 'skipped';
  description: string;
}

export function ClinicalTimeline({
  screeningDate,
  xrayResult,
  symptoms10s,
  referralDate,
  referredFacility,
  tbDiagnosed,
  diagnosisDate,
  attStartDate,
  nikshayId,
  treatmentCompletionDate,
  closureReason,
  onNodeClick,
}: ClinicalTimelineProps) {

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return null;
    }
  };

  // Determine Sputum Referral Completion
  const isReferralComplete = Boolean(referralDate);
  const isReferralActive = !isReferralComplete;

  // Determine Diagnosis Completion
  const isDiagnosisComplete = Boolean(tbDiagnosed === 'Y' || tbDiagnosed === 'N');
  const isDiagnosisActive = isReferralComplete && !isDiagnosisComplete;

  // Determine ATT Treatment Completion
  const isAttComplete = Boolean(attStartDate);
  const isAttActive = tbDiagnosed === 'Y' && !isAttComplete;
  const isAttSkipped = tbDiagnosed === 'N';

  // Determine Nikshay Completion
  const isNikshayComplete = Boolean(nikshayId);
  const isNikshayActive = isAttComplete && !isNikshayComplete;
  const isNikshaySkipped = tbDiagnosed === 'N';

  // Determine Closure Completion
  const isClosureComplete = tbDiagnosed === 'N' || Boolean(treatmentCompletionDate);
  const isClosureActive = (tbDiagnosed === 'Y' && isNikshayComplete && !treatmentCompletionDate);

  const nodes: TimelineNode[] = [
    {
      id: 'screened',
      label: 'Screened',
      sublabel: fmtDate(screeningDate) || 'Screened',
      icon: <Search className="w-4 h-4" />,
      status: 'complete',
      description: 'Initial prison TB screening encounter logged.'
    },
    {
      id: 'xray',
      label: 'X-Ray / Symptoms',
      sublabel: xrayResult ? xrayResult.replace(/_/g, ' ') : (symptoms10s === 'Yes' ? 'Symptomatic' : 'Screened'),
      icon: <AlertCircle className="w-4 h-4" />,
      status: 'complete',
      description: `Chest X-Ray / Clinical Symptoms: ${xrayResult ? xrayResult.replace(/_/g, ' ') : 'Recorded'}`
    },
    {
      id: 'referred',
      label: 'Sputum Referral',
      sublabel: referralDate ? (fmtDate(referralDate) || 'Referred') : 'Required',
      icon: <ArrowRightCircle className="w-4 h-4" />,
      status: isReferralComplete ? 'complete' : isReferralActive ? 'active' : 'pending',
      description: referralDate 
        ? `Referred for sputum test to: ${referredFacility ? referredFacility.replace(/_/g, ' ') : 'DMC'}` 
        : 'Sputum microscopy or molecular test referral pending.'
    },
    {
      id: 'diagnosed',
      label: 'Diagnosis',
      sublabel: tbDiagnosed === 'Y' 
        ? (diagnosisDate ? `TB+ (${fmtDate(diagnosisDate)})` : 'TB Diagnosed') 
        : tbDiagnosed === 'N' 
          ? (closureReason ? `Not TB (${closureReason.replace(/_/g, ' ')})` : 'Not TB') 
          : 'Pending',
      icon: <Activity className="w-4 h-4" />,
      status: isDiagnosisComplete ? 'complete' : isDiagnosisActive ? 'active' : 'pending',
      description: tbDiagnosed === 'Y' 
        ? 'TB Diagnosed (Positive Case confirmed by clinical evaluation).' 
        : tbDiagnosed === 'N' 
          ? `Closed: Not TB (${closureReason ? closureReason.replace(/_/g, ' ') : 'Alternative diagnosis'})` 
          : 'Pending diagnostic confirmation.'
    },
    {
      id: 'att',
      label: 'ATT Start',
      sublabel: isAttSkipped ? 'N/A' : (attStartDate ? (fmtDate(attStartDate) || 'Started') : 'Pending'),
      icon: <Pill className="w-4 h-4" />,
      status: isAttComplete ? 'complete' : isAttSkipped ? 'skipped' : isAttActive ? 'active' : 'pending',
      description: attStartDate 
        ? 'Anti-Tuberculosis Treatment (ATT) initiated.' 
        : isAttSkipped 
          ? 'Not applicable (ruled out TB).' 
          : 'Waiting for ATT drug regimen initiation.'
    },
    {
      id: 'nikshay',
      label: 'Nikshay ID',
      sublabel: isNikshaySkipped ? 'N/A' : (nikshayId ? nikshayId.replace(/_/g, ' ') : 'Pending'),
      icon: <ClipboardList className="w-4 h-4" />,
      status: isNikshayComplete ? 'complete' : isNikshaySkipped ? 'skipped' : isNikshayActive ? 'active' : 'pending',
      description: nikshayId 
        ? `Registered under Nikshay Portal ID: ${nikshayId.replace(/_/g, ' ')}` 
        : isNikshaySkipped 
          ? 'Not applicable.' 
          : 'Waiting for official Nikshay ID registration.'
    },
    {
      id: 'closure',
      label: 'Closure / Complete',
      sublabel: tbDiagnosed === 'N' 
        ? (closureReason ? `Closed (${closureReason.replace(/_/g, ' ')})` : 'Closed (Not TB)') 
        : treatmentCompletionDate 
          ? `Completed (${fmtDate(treatmentCompletionDate)})` 
          : 'Ongoing Treatment',
      icon: <CheckCircle2 className="w-4 h-4" />,
      status: isClosureComplete ? 'complete' : isClosureActive ? 'active' : 'pending',
      description: treatmentCompletionDate 
        ? 'ATT Treatment successfully completed.' 
        : tbDiagnosed === 'N' 
          ? `Case closed safely: Not TB (${closureReason ? closureReason.replace(/_/g, ' ') : 'TB ruled out'}).` 
          : 'Ongoing medical follow-up and monitoring.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full mt-1.5 mb-1.5 p-2 px-3 pb-3.5 rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
    >
      <div className="relative flex items-center justify-between w-full px-1 overflow-x-auto pb-0.5 hide-scrollbar">
        {/* Connecting Lines Container */}
        <div className="absolute left-10 right-10 top-[18px] h-[3px] bg-slate-100 pointer-events-none -z-10 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            {nodes.map((n, idx) => {
              if (idx === nodes.length - 1) return null;
              const nextNode = nodes[idx + 1];
              
              // Determine link color & completion flag
              let lineColor = 'bg-slate-100';
              let isSegmentComplete = false;
              
              if (n.status === 'complete') {
                if (nextNode.status === 'complete' || nextNode.status === 'skipped') {
                  lineColor = 'bg-emerald-500';
                  isSegmentComplete = true;
                } else if (nextNode.status === 'active') {
                  lineColor = 'bg-gradient-to-r from-emerald-500 to-amber-500';
                  isSegmentComplete = true;
                } else {
                  lineColor = 'bg-emerald-500/40';
                }
              } else if (n.status === 'skipped') {
                if (nextNode.status === 'complete' || nextNode.status === 'skipped') {
                  lineColor = 'bg-emerald-500';
                  isSegmentComplete = true;
                } else {
                  lineColor = 'bg-slate-200';
                }
              }

              return (
                <div 
                  key={`line-${idx}`} 
                  style={{ width: `${100 / (nodes.length - 1)}%` }} 
                  className="h-full relative overflow-hidden"
                >
                  {/* Base / Pending Underlay */}
                  <div className="absolute inset-0 bg-slate-100" />
                  
                  {/* Glowing Liquid Fill animation */}
                  {isSegmentComplete ? (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.6, delay: idx * 0.12, ease: "easeInOut" }}
                      className={`absolute left-0 top-0 h-full ${lineColor}`}
                      style={{
                        filter: 'drop-shadow(0 0 6px #10B981)',
                      }}
                    />
                  ) : (
                    <div className={`absolute inset-0 h-full ${lineColor}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Nodes */}
        {nodes.map((node) => {
          const isComplete = node.status === 'complete';
          const isActive = node.status === 'active';
          const isSkipped = node.status === 'skipped';

          // Interactive click handler focus maps (only on clickable steps)
          const isClickable = ['referred', 'diagnosed', 'att', 'nikshay'].includes(node.id);

          return (
            <div 
              key={node.id} 
              onClick={() => {
                if (isClickable && onNodeClick) {
                  onNodeClick(node.id);
                }
              }}
              className={`flex flex-col items-center flex-1 min-w-[85px] text-center group relative px-1 select-none ${
                isClickable ? 'cursor-pointer' : ''
              }`}
            >
              {/* Tooltip Card on Hover using elastic spring bezier */}
              <div className="absolute bottom-[48px] w-48 opacity-0 translate-y-3 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] origin-bottom bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-xl border border-slate-800 z-50 text-left pointer-events-none">
                <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400 mb-0.5">{node.label}</p>
                <p className="text-[10px] font-medium leading-relaxed text-slate-350">{node.description}</p>
                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-slate-900 border-r border-b border-slate-800" />
              </div>

              {/* Node Circle */}
              <div className="relative">
                {/* Complete outer rings (Double Ring Layout) */}
                {isComplete && (
                  <>
                    {/* Outer glow ring */}
                    <div className="absolute -inset-2 rounded-full border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-none" />
                    {/* Inner clean ring */}
                    <div className="absolute -inset-1 rounded-full border-2 border-emerald-500/40" />
                  </>
                )}
                
                {/* Active breathing outer pulse (Dual-Ring breathing loop) */}
                {isActive && (
                  <>
                    <motion.div 
                      className="absolute -inset-2.5 rounded-full border-2 border-amber-500/30"
                      animate={{
                        scale: [0.95, 1.1, 0.95],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        type: 'tween',
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div 
                      className="absolute -inset-1.5 rounded-full border border-amber-500/50"
                      animate={{
                        scale: [1.05, 0.95, 1.05],
                      }}
                      transition={{
                        type: 'tween',
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </>
                )}

                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all duration-300 transform-gpu ${
                    isComplete
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isActive
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : isSkipped
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 overflow-hidden'
                          : 'bg-white text-slate-400 border-2 border-slate-200 shadow-inner'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4 stroke-[3.5px]" />
                  ) : isSkipped ? (
                    <>
                      {node.icon}
                      {/* Diagonal Strike-through */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[140%] h-[2px] bg-slate-400 rotate-45 transform origin-center opacity-70" />
                      </div>
                    </>
                  ) : (
                    node.icon
                  )}
                </div>
              </div>

              {/* Label */}
              <span className={`text-[10px] font-bold mt-1.5 transition-colors ${
                isActive ? 'text-amber-600 font-extrabold' : isComplete ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {node.label}
              </span>

              {/* Sublabel */}
              <span className={`text-[8.5px] font-bold mt-0.5 px-1.5 py-0.5 rounded truncate max-w-full ${
                isComplete 
                  ? 'text-emerald-700 bg-emerald-50/50' 
                  : isActive 
                    ? 'text-amber-700 bg-amber-50 animate-pulse' 
                    : 'text-slate-400 bg-slate-50'
              }`}>
                {node.sublabel}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
