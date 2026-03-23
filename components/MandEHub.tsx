'use client';

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  memo,
  createContext,
  useContext,
} from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Users,
  Shield,
  Kanban,
  GitBranch,
  AlertTriangle,
  Merge,
  X,
  Eye,
  Calendar,
  Stethoscope,
  Microscope,
  FileSearch,
  Activity,
  Pill,
  TrendingDown,
  Search,
  Command,
  ChevronRight,
  Flame,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { PatientDetailDrawer } from './PatientDetailDrawer';
import { useTruthEngine } from '@/hooks/useTruthEngine';
import { ViolationCard } from './ViolationCard';
import { DataHealthGauge } from './DataHealthGauge';
import ThreeBackground from './ThreeBackground';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  inmate_name?: string;
  unique_id?: string;
  kobo_uuid?: string;
  facility_name?: string;
  age?: number;
  screening_date?: string;
  tb_diagnosed?: string;
  att_start_date?: string;
  referral_date?: string;
  xray_result?: string;
  symptoms_10s?: string;
  [key: string]: any;
}

interface DuplicatePair {
  key: string;
  recordA: Patient;
  recordB: Patient;
  matchReason: string;
  confidence: number; // 0-100
}

interface IntegrityViolation {
  id: string;
  patient: Patient;
  violation: string;
  severity: 'high' | 'medium';
  impactScore: number;
  suggestion: string;
}

interface CascadeStep {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
  icon: React.ElementType;
  color: string;
  hex: string;
}

interface CascadeConversion {
  rate: number;
  dropoff: number;
  critical: boolean;
}

type TabId = 'duplicates' | 'integrity' | 'cascade' | 'kanban';

interface HubContextValue {
  openPatient: (p: Patient) => void;
  globalPatients: Patient[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const HubContext = createContext<HubContextValue>({
  openPatient: () => {},
  globalPatients: [],
});

const useHub = () => useContext(HubContext);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'duplicates', label: 'Duplicate Assassin', short: 'Dupes', icon: Users },
  { id: 'integrity', label: 'Integrity Scanner', short: 'Integrity', icon: Shield },
  { id: 'cascade', label: 'Care Cascade', short: 'Cascade', icon: GitBranch },
  { id: 'kanban', label: 'SLA Kanban', short: 'Kanban', icon: Kanban },
];

const RECORD_DISPLAY_FIELDS = [
  { key: 'inmate_name', label: 'Name' },
  { key: 'unique_id', label: 'Unique ID' },
  { key: 'facility_name', label: 'Facility' },
  { key: 'age', label: 'Age' },
  { key: 'screening_date', label: 'Screening Date' },
  { key: 'tb_diagnosed', label: 'TB Diagnosed' },
];

const CONFLICT_CHECK_FIELDS = ['age', 'screening_date', 'tb_diagnosed', 'facility_name'];

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function pairKey(a: Patient, b: Patient) {
  return `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
}

function safePct(num: number, denom: number) {
  return denom > 0 ? (num / denom) * 100 : 0;
}

function getConflicts(a: Patient, b: Patient): Set<string> {
  const s = new Set<string>();
  CONFLICT_CHECK_FIELDS.forEach((f) => { if (a[f] !== b[f]) s.add(f); });
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Counter
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.8, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value]);

  return <span className={className}>{display}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Palette
// ─────────────────────────────────────────────────────────────────────────────

function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  type CommandItem = { label: string; icon: React.ElementType; action: () => void };
  
  const commands: CommandItem[] = useMemo(() => [
    ...TABS.map((t) => ({
      label: `Go to ${t.label}`,
      icon: t.icon,
      action: () => { onNavigate(t.id); onClose(); },
    })),
    { label: 'Export violations CSV', icon: BarChart3, action: onClose },
    { label: 'Refresh data', icon: Sparkles, action: onClose },
  ], [onNavigate, onClose]);

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands…"
                className="flex-1 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
              />
              <kbd className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded font-mono">ESC</kbd>
            </div>

            {/* Commands */}
            <div className="py-2 max-h-72 overflow-y-auto">
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon as any;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={cmd.action}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    {/* @ts-ignore */}
                    <Icon className="w-4 h-4 text-slate-400" />
                    {cmd.label}
                    {/* @ts-ignore */}
                    <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400 text-center">No commands found</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence Bar (live anomaly strip)
// ─────────────────────────────────────────────────────────────────────────────

function IntelligenceBar({
  duplicates,
  high,
  medium,
  attLeak,
  onChipClick,
}: {
  duplicates: number;
  high: number;
  medium: number;
  attLeak: boolean;
  onChipClick: (tab: TabId) => void;
}) {
  const chips = [
    {
      count: duplicates,
      label: 'duplicates',
      color: 'bg-violet-50 text-violet-700 border-violet-200',
      dot: 'bg-violet-500',
      tab: 'duplicates' as TabId,
    },
    {
      count: high,
      label: 'critical errors',
      color: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
      tab: 'integrity' as TabId,
    },
    {
      count: medium,
      label: 'warnings',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-400',
      tab: 'integrity' as TabId,
    },
  ].filter((c) => c.count > 0);

  if (chips.length === 0 && !attLeak) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 flex-wrap"
    >
      {attLeak && (
        <motion.button
          type="button"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          onClick={() => onChipClick('cascade')}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold shadow-[0_0_12px_rgb(220,38,38,0.4)]"
        >
          <Flame className="w-3 h-3" />
          ATT initiation leak
        </motion.button>
      )}
      {chips.map((chip) => (
        <button
          type="button"
          key={chip.label}
          onClick={() => onChipClick(chip.tab)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-80 ${chip.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
          <AnimatedNumber value={chip.count} /> {chip.label}
        </button>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────────────────────────────────────

interface MandEHubProps {
  globalPatients?: Patient[];
}

export default function MandEHub({ globalPatients = [] }: MandEHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('duplicates');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());
  const [cmdOpen, setCmdOpen] = useState(false);
  const [integrityFilter, setIntegrityFilter] = useState<'all' | 'high' | 'medium'>('all');

  // ── Keyboard shortcut ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Duplicate pairs ────────────────────────────────────────────────────

  const duplicatePairs = useMemo<DuplicatePair[]>(() => {
    const pairs: DuplicatePair[] = [];
    if (!globalPatients || globalPatients.length === 0) return pairs;

    const nameFacilityMap = new Map<string, Patient[]>();
    const uuidMap = new Map<string, Patient[]>();
    const processed = new Set<string>();

    // O(N) Single Pass: Group into buckets (takes ~1 millisecond)
    for (const p of globalPatients) {
      if (p.kobo_uuid) {
        const arr = uuidMap.get(p.kobo_uuid) || [];
        arr.push(p);
        uuidMap.set(p.kobo_uuid, arr);
      }
      if (p.inmate_name && p.facility_name) {
        // Safely extract YYYY-MM
        let monthKey = 'unknown_date';
        if (p.screening_date) {
          const d = new Date(p.screening_date);
          if (!isNaN(d.getTime())) {
            monthKey = `${d.getFullYear()}-${d.getMonth()}`;
          }
        }
        
        // Strict Bucket Key: Name + Facility + Month
        const key = `${(p.inmate_name || 'unknown').toLowerCase().trim()}-${p.facility_name}-${monthKey}`;
        const arr = nameFacilityMap.get(key) || [];
        arr.push(p);
        nameFacilityMap.set(key, arr);
      }
    }

    // O(1) Bucket Processing Helper: Only compares patients that share the same bucket
    const processGroup = (group: Patient[], reason: string) => {
      if (group.length > 1) {
        // Hard cap to prevent N^2 explosion on bad data
        const safeGroup = group.slice(0, 10);
        for (let i = 0; i < safeGroup.length; i++) {
          for (let j = i + 1; j < safeGroup.length; j++) {
            const a = safeGroup[i];
            const b = safeGroup[j];
            const key = pairKey(a, b);
            
            if (!processed.has(key) && !dismissedPairs.has(key)) {
              const conflicts = getConflicts(a, b);
              pairs.push({
                key,
                recordA: a,
                recordB: b,
                matchReason: reason,
                // Fewer conflicting fields = higher confidence
                confidence: Math.max(0, 100 - conflicts.size * 18)
              });
              processed.add(key);
            }
          }
        }
      }
    };

    // Process the matched buckets
    uuidMap.forEach(group => processGroup(group, 'Matching Kobo UUID'));
    nameFacilityMap.forEach(group => processGroup(group, 'Same name + facility + month'));

    return pairs.sort((a, b) => b.confidence - a.confidence);
  }, [globalPatients, dismissedPairs]);

  // ── Integrity violations (delegated to useTruthEngine hook) ───────────
  const truthEngineResult = useTruthEngine(globalPatients);
  const { violations: integrityViolations, healthScore, highCount, mediumCount } = truthEngineResult;

  // ── Cascade data ───────────────────────────────────────────────────────

  const cascadeData = useMemo(() => {
    const total = globalPatients.length;
    const presumptive = globalPatients.filter(
      (p) =>
        (p.xray_result &&
          (p.xray_result.toLowerCase().includes('abnormal') ||
            p.xray_result.toLowerCase().includes('suspected'))) ||
        (p.symptoms_10s && p.symptoms_10s !== 'No Symptoms')
    );
    const referred = globalPatients.filter((p) => !!p.referral_date);
    const diagnosed = globalPatients.filter(
      (p) => p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes'
    );
    const initiated = globalPatients.filter((p) => !!p.att_start_date);
    const initiationRate = safePct(initiated.length, diagnosed.length);
    const criticalLeak = initiationRate < 95 && diagnosed.length > 0;

    const steps: CascadeStep[] = [
      { id: 'screened', label: 'Total Screened', shortLabel: 'Screened', count: total, icon: Stethoscope, color: 'blue', hex: '#3b82f6' },
      { id: 'presumptive', label: 'Presumptive TB', shortLabel: 'Presumptive', count: presumptive.length, icon: FileSearch, color: 'purple', hex: '#8b5cf6' },
      { id: 'referred', label: 'Referred', shortLabel: 'Referred', count: referred.length, icon: Microscope, color: 'indigo', hex: '#6366f1' },
      { id: 'diagnosed', label: 'TB Diagnosed', shortLabel: 'Diagnosed', count: diagnosed.length, icon: Activity, color: 'amber', hex: '#f59e0b' },
      { id: 'initiated', label: 'ATT Initiated', shortLabel: 'On ATT', count: initiated.length, icon: Pill, color: 'emerald', hex: '#10b981' },
    ];

    const conversions: CascadeConversion[] = [
      { rate: safePct(presumptive.length, total), dropoff: total - presumptive.length, critical: false },
      { rate: safePct(referred.length, presumptive.length), dropoff: presumptive.length - referred.length, critical: false },
      { rate: safePct(diagnosed.length, referred.length), dropoff: referred.length - diagnosed.length, critical: false },
      { rate: initiationRate, dropoff: diagnosed.length - initiated.length, critical: criticalLeak },
    ];

    return { steps, conversions, criticalLeak, total, totalInitiated: initiated.length };
  }, [globalPatients]);

  // ── Derived counts for intelligence bar (using useTruthEngine) ────────

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleDismiss = useCallback((pair: DuplicatePair) => {
    setDismissedPairs((prev) => new Set(prev).add(pair.key));
  }, []);

  const handleGaugeClick = useCallback((severity: 'high' | 'medium') => {
    setActiveTab('integrity');
    setIntegrityFilter(severity);
    setTimeout(() => {
      const integritySection = document.getElementById('integrity-scanner');
      if (integritySection) {
        integritySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const ctxValue = useMemo<HubContextValue>(
    () => ({ openPatient: setSelectedPatient, globalPatients }),
    [globalPatients]
  );

  return (
    <HubContext.Provider value={ctxValue}>
      <div className="h-full overflow-y-auto relative p-6 lg:p-8">
        <ThreeBackground />
        <div className="max-w-7xl mx-auto space-y-8 relative z-10">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[32px] font-black text-slate-900 tracking-tighter uppercase leading-tight">
                M&E Intelligence <span className="text-blue-600">Hub</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-80">
                Monitoring & Evaluation · {globalPatients.length.toLocaleString()} patients loaded
              </p>
            </div>

            {/* Command palette trigger */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all shadow-sm"
            >
              <Command className="w-4 h-4" />
              <span>Commands</span>
              <kbd className="ml-1 text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>
          </div>

          {/* ── Intelligence Bar ─────────────────────────────────────────── */}
          <IntelligenceBar
            duplicates={duplicatePairs.length}
            high={highCount}
            medium={mediumCount}
            attLeak={cascadeData.criticalLeak}
            onChipClick={setActiveTab}
          />

          {/* ── Data Health Gauge ────────────────────────────────────────── */}
          <DataHealthGauge
            healthScore={healthScore}
            highCount={highCount}
            mediumCount={mediumCount}
            onSectionClick={handleGaugeClick}
          />

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className="glass-light rounded-3xl border border-white shadow-2xl p-2 relative z-10">
            <div className="relative flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="flex-1 relative">
                    {isActive && (
                      <motion.div
                        layoutId="pill"
                        className="absolute inset-0 bg-slate-900 rounded-[14px]"
                        style={{ zIndex: 0 }}
                        transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="relative z-10 w-full px-4 py-2.5 rounded-[14px] font-medium text-sm flex items-center justify-center gap-2 transition-colors duration-150"
                      style={{ color: isActive ? '#ffffff' : '#64748b' }}
                    >
                      {/* @ts-ignore */}
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.short}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {activeTab === 'duplicates' && (
                <DuplicateAssassin pairs={duplicatePairs} onDismiss={handleDismiss} />
              )}
              {activeTab === 'integrity' && (
                <div id="integrity-scanner">
                  <IntegrityScannerUpgraded 
                    violations={integrityViolations}
                    initialFilter={integrityFilter}
                    onFilterChange={setIntegrityFilter}
                  />
                </div>
              )}
              {activeTab === 'cascade' && (
                <CareCascadeFlow data={cascadeData} />
              )}
              {activeTab === 'kanban' && (
                <AgingSLAKanban patients={globalPatients} />
              )}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={setActiveTab}
      />

      {selectedPatient && (
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen
          onClose={() => setSelectedPatient(null)}
          onUpdate={() => {}}
        />
      )}
    </HubContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Assassin
// ─────────────────────────────────────────────────────────────────────────────

function DuplicateAssassin({
  pairs,
  onDismiss,
}: {
  pairs: DuplicatePair[];
  onDismiss: (pair: DuplicatePair) => void;
}) {
  const { openPatient } = useHub();
  const [idx, setIdx] = useState(0);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    setIdx((prev) => (prev >= pairs.length ? Math.max(0, pairs.length - 1) : prev));
  }, [pairs.length]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (pairs.length === 0) return; // Don't listen if no pairs
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft') advance();
      if (e.key === 'd' || e.key === 'D') { handleDismiss(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, pairs]);

  const advance = () => setIdx((p) => Math.min(p + 1, pairs.length - 1));

  const handleDismiss = () => {
    if (!pair) return;
    setExiting('right');
    setTimeout(() => {
      onDismiss(pair);
      setExiting(null);
    }, 280);
  };

  if (pairs.length === 0) {
    return <AllClear icon={Users} title="No Duplicates Found" sub="Your database is clean — no potential duplicates detected." />;
  }

  const pair = pairs[idx];
  if (!pair) return null;

  const conflicts = getConflicts(pair.recordA, pair.recordB);
  const progress = pairs.length > 0 ? ((idx + 1) / pairs.length) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 font-semibold">
            {idx + 1} <span className="text-slate-400 font-normal">of {pairs.length} potential duplicates</span>
          </span>
          <ConfidenceBadge value={pair.confidence} />
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Split Review Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pair.key}
          initial={{ opacity: 0, x: exiting === 'right' ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: exiting === 'right' ? -60 : 60 }}
          transition={{ duration: 0.28 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <RecordCard record={pair.recordA} label="Record A" conflicts={conflicts} onView={() => openPatient(pair.recordA)} />
          <RecordCard record={pair.recordB} label="Record B" conflicts={conflicts} onView={() => openPatient(pair.recordB)} />
        </motion.div>
      </AnimatePresence>

      {/* Match badge */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-3.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm font-medium text-amber-900">
          Match detected: <span className="font-bold">{pair.matchReason}</span>
        </span>
        {conflicts.size > 0 && (
          <span className="ml-auto text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            {conflicts.size} conflicting field{conflicts.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        <ActionButton
          onClick={() => { advance(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgb(37,99,235,0.3)]"
          icon={<Merge className="w-4 h-4" />}
          label="Keep A"
          hint="merges B→A"
        />
        <ActionButton
          onClick={() => { advance(); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_14px_rgb(5,150,105,0.3)]"
          icon={<Merge className="w-4 h-4 scale-x-[-1]" />}
          label="Keep B"
          hint="merges A→B"
        />
        <ActionButton
          onClick={handleDismiss}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700"
          icon={<X className="w-4 h-4" />}
          label="Dismiss"
          hint="press D"
        />
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-red-50 text-red-700 border-red-200' :
    value >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-emerald-50 text-emerald-700 border-emerald-200';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
      {value}% confidence match
    </span>
  );
}

function ActionButton({
  onClick,
  className,
  icon,
  label,
  hint,
}: {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${className}`}
    >
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className="text-xs opacity-60 font-normal">{hint}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Record Card
// ─────────────────────────────────────────────────────────────────────────────

const RecordCard = memo(function RecordCard({
  record,
  label,
  conflicts,
  onView,
}: {
  record: Patient;
  label: string;
  conflicts: Set<string>;
  onView: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View full
        </button>
      </div>

      <div className="space-y-2">
        {RECORD_DISPLAY_FIELDS.map(({ key, label }) => {
          const isConflict = conflicts.has(key);
          return (
            <div
              key={key}
              className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isConflict
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-slate-50'
              }`}
            >
              <span className="text-xs text-slate-400 font-medium">{label}</span>
              <p className={`font-semibold mt-0.5 ${isConflict ? 'text-yellow-800' : 'text-slate-900'}`}>
                {record[key] ?? <span className="text-slate-300 font-normal italic">—</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Integrity Scanner (Upgraded with Truth Engine)
// ─────────────────────────────────────────────────────────────────────────────

function IntegrityScannerUpgraded({ 
  violations,
  initialFilter = 'all',
  onFilterChange
}: { 
  violations: any[];
  initialFilter?: 'all' | 'high' | 'medium';
  onFilterChange?: (filter: 'all' | 'high' | 'medium') => void;
}) {
  const { openPatient } = useHub();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>(initialFilter);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const handleFilterChange = (newFilter: 'all' | 'high' | 'medium') => {
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  const filtered = useMemo(
    () => (filter === 'all' ? violations : violations.filter((v) => v.severity === filter)),
    [violations, filter]
  );

  const highCount = violations.filter((v) => v.severity === 'high').length;
  const medCount = violations.filter((v) => v.severity === 'medium').length;

  const handleResolve = (v: any) => openPatient(v.patient);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: violations.length, color: 'text-slate-900', active: filter === 'all', onClick: () => handleFilterChange('all') },
          { label: 'High', value: highCount, color: 'text-red-600', active: filter === 'high', onClick: () => handleFilterChange('high') },
          { label: 'Medium', value: medCount, color: 'text-amber-600', active: filter === 'medium', onClick: () => handleFilterChange('medium') },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className={`bg-white rounded-2xl border p-5 text-left transition-all ${
              s.active ? 'border-slate-900 shadow-[0_0_0_1px_#0f172a]' : 'border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-slate-300'
            }`}
          >
            <p className="text-xs text-slate-500 mb-1">{s.label} Violations</p>
            <AnimatedNumber value={s.value} className={`text-3xl font-bold ${s.color}`} />
          </button>
        ))}
      </div>

      {/* Violation cards */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {filtered.map((v, i) => (
            <ViolationCard
              key={v.id}
              violation={v}
              onResolve={handleResolve}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Integrity Scanner (Legacy - kept for reference)
// ─────────────────────────────────────────────────────────────────────────────

function IntegrityScanner({ violations }: { violations: IntegrityViolation[] }) {
  const { openPatient } = useHub();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? violations : violations.filter((v) => v.severity === filter)),
    [violations, filter]
  );

  const highCount = violations.filter((v) => v.severity === 'high').length;
  const medCount = violations.filter((v) => v.severity === 'medium').length;

  if (violations.length === 0) {
    return <AllClear icon={Shield} title="Data Integrity Perfect" sub="No logical errors or anomalies detected in your dataset." />;
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: violations.length, color: 'text-slate-900', active: filter === 'all', onClick: () => setFilter('all') },
          { label: 'High', value: highCount, color: 'text-red-600', active: filter === 'high', onClick: () => setFilter('high') },
          { label: 'Medium', value: medCount, color: 'text-amber-600', active: filter === 'medium', onClick: () => setFilter('medium') },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className={`bg-white rounded-2xl border p-5 text-left transition-all ${
              s.active ? 'border-slate-900 shadow-[0_0_0_1px_#0f172a]' : 'border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:border-slate-300'
            }`}
          >
            <p className="text-xs text-slate-500 mb-1">{s.label} Violations</p>
            <AnimatedNumber value={s.value} className={`text-3xl font-bold ${s.color}`} />
          </button>
        ))}
      </div>

      {/* Violations list */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((v, i) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16, height: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.22 }}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${
                v.severity === 'high' ? 'border-red-100' : 'border-amber-100'
              }`}
            >
              {/* Severity dot */}
              <div className={`w-2 h-full min-h-[40px] rounded-full shrink-0 ${v.severity === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-slate-900 text-sm truncate">{v.patient.inmate_name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${v.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {v.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mb-1">
                  {v.patient.facility_name} · {v.patient.unique_id}
                </p>
                <p className={`text-sm font-medium ${v.severity === 'high' ? 'text-red-700' : 'text-amber-700'}`}>
                  {v.violation}
                </p>
              </div>

              {/* Resolve */}
              <button
                type="button"
                onClick={() => openPatient(v.patient)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Resolve
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Care Cascade Flow — SVG Funnel
// ─────────────────────────────────────────────────────────────────────────────

function CareCascadeFlow({
  data,
}: {
  data: {
    steps: CascadeStep[];
    conversions: CascadeConversion[];
    criticalLeak: boolean;
    total: number;
    totalInitiated: number;
  };
}) {
  const { steps, conversions, total, totalInitiated } = data;
  const maxCount = steps[0]?.count || 1;

  return (
    <div className="space-y-5">
      {/* SVG Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-6">
        <h2 className="text-base font-bold text-slate-900 mb-6">Patient Journey Funnel</h2>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const pct = safePct(step.count, maxCount);
            const conv = i > 0 ? conversions[i - 1] : null;

            return (
              <div key={step.id}>
                {conv && (
                  <div className="flex items-center gap-3 py-1 pl-6">
                    <div className="w-px h-4 bg-slate-200" />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      conv.critical ? 'bg-red-50 text-red-700 border-red-200' :
                      conv.rate >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      conv.rate >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {conv.critical && '⚠️ '}{conv.rate.toFixed(1)}% conversion
                      {conv.dropoff > 0 && <span className="opacity-60 ml-1">(-{conv.dropoff.toLocaleString()})</span>}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: step.hex + '20', color: step.hex }}
                  >
                    {/* @ts-ignore */}
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Bar */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{step.label}</span>
                      <AnimatedNumber value={step.count} className="font-bold text-slate-900" />
                    </div>
                    <div className="h-7 bg-slate-100 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: i * 0.1, duration: 0.7, ease: 'easeOut' }}
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{ backgroundColor: step.hex }}
                      >
                        {pct > 12 && (
                          <span className="text-white text-xs font-bold">{pct.toFixed(1)}%</span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Overall Conversion',
            value: `${total > 0 ? ((totalInitiated / total) * 100).toFixed(1) : 0}%`,
            color: 'text-slate-900',
            sub: 'screened → on ATT',
          },
          {
            label: 'Total Drop-offs',
            value: (total - totalInitiated).toLocaleString(),
            color: 'text-red-600',
            sub: 'patients lost in cascade',
          },
          {
            label: 'Diagnosis Rate',
            value: `${conversions[2].rate.toFixed(1)}%`,
            color: 'text-amber-600',
            sub: 'referred → diagnosed',
          },
          {
            label: 'ATT Initiation',
            value: `${conversions[3].rate.toFixed(1)}%`,
            color: data.criticalLeak ? 'text-red-600' : 'text-emerald-600',
            sub: data.criticalLeak ? '⚠️ below 95% target' : 'diagnosed → on ATT',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5"
          >
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Aging SLA Kanban
// ─────────────────────────────────────────────────────────────────────────────

interface SLAPatient {
  patient: Patient;
  daysWaiting: number;
  severity: 'critical' | 'warning' | 'safe';
}

function AgingSLAKanban({ patients }: { patients: Patient[] }) {
  const { openPatient } = useHub();

  const { pendingReferral, pendingDiagnosis, pendingTreatment } = useMemo(() => {
    const referral: SLAPatient[] = [];
    const diagnosis: SLAPatient[] = [];
    const treatment: SLAPatient[] = [];
    const now = Date.now();

    for (const p of patients) {
      // Skip completed patients
      if (p.att_start_date) continue;

      let baseDate: string | null = null;
      let bucket: SLAPatient[] | null = null;

      const isTB = p.tb_diagnosed === 'Y' || p.tb_diagnosed === 'Yes';

      if (isTB) {
        // Pending Treatment
        baseDate = p.screening_date || p.referral_date;
        bucket = treatment;
      } else if (p.referral_date) {
        // Pending Diagnosis
        baseDate = p.referral_date;
        bucket = diagnosis;
      } else if (p.screening_date) {
        // Pending Referral
        baseDate = p.screening_date;
        bucket = referral;
      }

      if (baseDate && bucket) {
        const date = new Date(baseDate);
        if (!isNaN(date.getTime())) {
          const daysWaiting = Math.floor((now - date.getTime()) / 86400000);
          const severity: 'critical' | 'warning' | 'safe' =
            daysWaiting > 7 ? 'critical' : daysWaiting >= 4 ? 'warning' : 'safe';

          bucket.push({ patient: p, daysWaiting, severity });
        }
      }
    }

    // Sort descending by daysWaiting (most critical first)
    const sortDesc = (a: SLAPatient, b: SLAPatient) => b.daysWaiting - a.daysWaiting;
    referral.sort(sortDesc);
    diagnosis.sort(sortDesc);
    treatment.sort(sortDesc);

    return {
      pendingReferral: referral,
      pendingDiagnosis: diagnosis,
      pendingTreatment: treatment,
    };
  }, [patients]);

  const lanes = [
    {
      id: 'referral',
      title: 'Pending Referral',
      icon: FileSearch,
      color: 'blue',
      data: pendingReferral,
      total: pendingReferral.length,
    },
    {
      id: 'diagnosis',
      title: 'Pending Diagnosis',
      icon: Microscope,
      color: 'purple',
      data: pendingDiagnosis,
      total: pendingDiagnosis.length,
    },
    {
      id: 'treatment',
      title: 'Pending Treatment',
      icon: Pill,
      color: 'amber',
      data: pendingTreatment,
      total: pendingTreatment.length,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        {lanes.map((lane) => {
          const Icon = lane.icon;
          const criticalCount = lane.data.filter((s) => s.severity === 'critical').length;
          return (
            <div
              key={lane.id}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${lane.color}-50`}
                >
                  {/* @ts-ignore */}
                  <Icon className={`w-5 h-5 text-${lane.color}-600`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{lane.title}</p>
                  <AnimatedNumber value={lane.total} className="text-2xl font-bold text-slate-900" />
                </div>
              </div>
              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-semibold">{criticalCount} critical</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanban Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
        {lanes.map((lane) => {
          const Icon = lane.icon;
          const slicedData = lane.data.slice(0, 50);

          return (
            <div key={lane.id} className="space-y-3">
              {/* Lane Header */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${lane.color}-50`}
                  >
                    {/* @ts-ignore */}
                    <Icon className={`w-4 h-4 text-${lane.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{lane.title}</h3>
                    <p className="text-xs text-slate-500">
                      {lane.total} patient{lane.total !== 1 ? 's' : ''}
                      {lane.total > 50 && ` (showing first 50)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {slicedData.map((item, idx) => {
                    const { patient, daysWaiting, severity } = item;
                    const severityConfig = {
                      critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
                      warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                      safe: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
                    };
                    const config = severityConfig[severity];

                    return (
                      <motion.button
                        key={patient.id}
                        type="button"
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
                        onClick={() => openPatient(patient)}
                        className="w-full bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] p-4 text-left hover:-translate-y-0.5 hover:shadow-md transition-all"
                      >
                        {/* SLA Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm truncate">
                              {patient.inmate_name}
                            </h4>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}
                          >
                            {daysWaiting}d
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 truncate">
                            {patient.facility_name || 'Unknown Facility'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {patient.unique_id}
                          </p>
                        </div>

                        {/* Severity Indicator */}
                        {severity === 'critical' && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-semibold">SLA Breach</span>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>

                {slicedData.length === 0 && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-medium">All clear</p>
                    <p className="text-xs text-slate-400 mt-1">No patients in this stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coming Soon (Kanban placeholder)
// ─────────────────────────────────────────────────────────────────────────────

const ComingSoon = memo(function ComingSoon({
  title,
  icon: Icon,
  description,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-16 text-center">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl flex items-center justify-center mx-auto shadow-[0_8px_24px_rgb(0,0,0,0.15)]">
          {/* @ts-ignore */}
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <Calendar className="w-3.5 h-3.5" />
          <span>Coming next sprint</span>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// All Clear (empty state)
// ─────────────────────────────────────────────────────────────────────────────

function AllClear({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-16 text-center"
    >
      <div className="max-w-xs mx-auto space-y-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
          className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </motion.div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}
