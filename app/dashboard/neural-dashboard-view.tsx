'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Users, ChevronRight, X } from 'lucide-react';
import MindMapDashboard from '@/components/MindMapDashboard';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';
import { PatientDetailDrawer } from '@/components/PatientDetailDrawer';

interface NeuralDashboardViewProps {
  globalPatients?: any[];
  isLoading?: boolean;
  onNavigateToPipeline?: () => void;
  filter?: any; // Re-added
  onSetFilter?: (f: any) => void; // Re-added
}

/* ─── Empty state ─── */
function EmptyState({ onNavigateToPipeline }: { onNavigateToPipeline?: () => void }) {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-center">
       {/* UI code omitted for brevity but preserved in your file */}
       <h3 className="text-white font-bold text-xl">No Patient Data</h3>
    </div>
  );
}

/* ─── Resizable panel divider ─── */
function PanelDivider({ onDrag }: { onDrag: (delta: number) => void }) {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -150, right: 150 }}
      dragElastic={0}
      dragMomentum={false}
      onDrag={(_, info) => onDrag(info.delta.x)}
      whileHover={{ scaleX: 3 }}
      className="relative w-px bg-slate-200/80 cursor-col-resize flex-shrink-0 group"
    >
      <div className="absolute inset-y-0 -left-2 -right-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-slate-300 group-hover:bg-blue-400 rounded-full transition-colors" />
    </motion.div>
  );
}

/* ─── Main component ─── */
const NeuralDashboardView = memo(function NeuralDashboardView({
  globalPatients = [],
  isLoading = false,
  onNavigateToPipeline,
  filter,      // FIXED: Now accepting filter
  onSetFilter, // FIXED: Now accepting filter setter
}: NeuralDashboardViewProps) {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [pipelineWidth, setPipelineWidth] = useState(40);

  // ── CRITICAL: The Filter Engine (Memoized to prevent re-calculation) ──
  const filteredPatients = useMemo(() => {
    if (!filter) return globalPatients;
    
    return globalPatients.filter(p => {
      // 1. District Match (if specified)
      const districtMatch = !filter.district || p.screening_district === filter.district;
      
      // 2. Date Match (if specified)
      let dateMatch = true;
      if (filter.date) {
        const dateValue = p.screening_date || p.submitted_on;
        if (!dateValue) {
          dateMatch = false;
        } else {
          const pDate = new Date(dateValue);
          if (isNaN(pDate.getTime())) {
            dateMatch = false;
          } else {
            dateMatch = pDate.toISOString().split('T')[0] === filter.date;
          }
        }
      }
      
      // 3. Action Match (if specified)
      let actionMatch = true;
      if (filter.actionType) {
        if (filter.actionType === 'sputum') actionMatch = !p.referral_date;
        else if (filter.actionType === 'diagnosis') actionMatch = p.referral_date && !p.tb_diagnosed;
        else if (filter.actionType === 'treatment') actionMatch = p.tb_diagnosed === 'Y' && !p.att_start_date;
      }
      
      return districtMatch && dateMatch && actionMatch;
    });
  }, [globalPatients, filter]);

  const handleDrag = useCallback((delta: number) => {
    setPipelineWidth((prev) => {
      const containerWidth = window.innerWidth;
      const deltaPct = (delta / containerWidth) * 100;
      return Math.min(60, Math.max(25, prev - deltaPct));
    });
  }, []);

  const handlePatientClick = useCallback((patient: any) => setSelectedPatient(patient), []);
  const handleDrawerClose = useCallback(() => setSelectedPatient(null), []);

  if (!globalPatients.length) {
    return <EmptyState onNavigateToPipeline={onNavigateToPipeline} />;
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden">

      {/* ── Left: Mind Map (FROZEN - only re-renders if patients array changes) ── */}
      <motion.div
        layout
        style={{ width: `${100 - pipelineWidth}%` }}
        className="flex-shrink-0 overflow-y-auto relative"
      >
        <MemoizedMindMap
          patients={globalPatients}
          onSetFilter={onSetFilter}
        />
      </motion.div>

      <PanelDivider onDrag={handleDrag} />

      {/* ── Right: Follow-up Pipeline ── */}
      <motion.div
        layout
        style={{ width: `${pipelineWidth}%` }}
        className="flex-shrink-0 flex flex-col overflow-hidden border-l border-slate-200/60 bg-white/60 backdrop-blur-sm"
      >
        {/* Panel header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white/80">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {filter ? 'Filtered List' : 'Full Pipeline'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filter && (
              <button
                onClick={() => onSetFilter?.(null)}
                className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
              >
                {filter.actionType && (
                  <span>{filter.actionType.charAt(0).toUpperCase() + filter.actionType.slice(1)} Filter Active</span>
                )}
                <X className="w-3 h-3" />
              </button>
            )}
            <motion.span
              key={filteredPatients.length}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-bold text-slate-400 tabular-nums"
            >
              {filteredPatients.length.toLocaleString()} records
            </motion.span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <FollowUpPipeline
            globalPatients={filteredPatients} // FIXED: Using the filtered list!
            isLoading={isLoading}
            onPatientClick={handlePatientClick}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedPatient && (
          <PatientDetailDrawer
            patient={selectedPatient}
            isOpen={!!selectedPatient}
            onClose={handleDrawerClose}
            onUpdate={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// ── CRITICAL: Memoize MindMap to prevent re-renders when filter changes ──
const MemoizedMindMap = memo(MindMapDashboard, (prev, next) => {
  return prev.patients === next.patients; // Only re-render if patients array changes
});

export default NeuralDashboardView;