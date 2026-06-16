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
  GitBranch,
  AlertTriangle,
  Merge,
  X,
  Eye,
  Stethoscope,
  Microscope,
  FileSearch,
  FileImage,
  Activity,
  Pill,
  Search,
  Command,
  ChevronRight,
  Flame,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Sparkles,
  User,
  FileText,
  Building2,
  Calendar,
  CalendarCheck,
  Database,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { PatientDetailDrawer } from './PatientDetailDrawer';
import { useTruthEngine } from '@/hooks/useTruthEngine';
import { ViolationCard } from './ViolationCard';
import { DataHealthGauge } from './DataHealthGauge';
import ThreeBackground from './ThreeBackground';
import { useSWRConfig } from 'swr';
import { DuplicateAssassin, detectExactDuplicates, type DuplicatePair, type Patient } from './DuplicateAssassin';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Patient and DuplicatePair types are now imported from DuplicateAssassin

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

type TabId = 'duplicates' | 'integrity' | 'cascade';

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
];

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function safePct(num: number, denom: number) {
  return denom > 0 ? (num / denom) * 100 : 0;
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
// Intelligence Bar (live anomaly strip) — AWWWARDS REFINED
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
      color: 'bg-violet-500/10 text-violet-700 border-violet-500/20 hover:bg-violet-500/15 hover:border-violet-500/30',
      dot: 'bg-violet-500',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',
      tab: 'duplicates' as TabId,
    },
    {
      count: high,
      label: 'critical errors',
      color: 'bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30',
      dot: 'bg-red-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      tab: 'integrity' as TabId,
    },
    {
      count: medium,
      label: 'warnings',
      color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30',
      dot: 'bg-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      tab: 'integrity' as TabId,
    },
  ].filter((c) => c.count > 0);

  if (chips.length === 0 && !attLeak) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-2.5 flex-wrap"
    >
      {attLeak && (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onChipClick('cascade')}
          aria-label="View ATT initiation leak in Care Cascade"
          className="group relative inline-flex items-center h-8 gap-2 px-4 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full text-xs font-semibold shadow-[0_4px_16px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_24px_rgba(220,38,38,0.4)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <Flame className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">ATT initiation leak</span>
        </motion.button>
      )}
      {chips.map((chip, idx) => (
        <motion.button
          type="button"
          key={chip.label}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChipClick(chip.tab)}
          aria-label={`View ${chip.count} ${chip.label}`}
          className={`inline-flex items-center h-8 gap-2.5 px-4 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${chip.color} ${chip.glow}`}
        >
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} 
          />
          <AnimatedNumber value={chip.count} /> {chip.label}
        </motion.button>
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
  const [isCompactMode, setIsCompactMode] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { mutate } = useSWRConfig();

  // Debug log
  console.log('MandEHub - Received patients:', globalPatients?.length || 0);

  // ── Compact mode detection ────────────────────────────────────────────

  useEffect(() => {
    const checkViewport = () => setIsCompactMode(window.innerHeight < 860);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // ── Keyboard shortcut ────────────────────────────────────────────────

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

  // ── Duplicate pairs (using strict exact duplicate detection) ─────────────

  const duplicatePairs = useMemo<DuplicatePair[]>(() => {
    return detectExactDuplicates(globalPatients, dismissedPairs, {
      bucketByNameFacility: true,
      bucketByUUID: true,
    });
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
      <div ref={rootRef} className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Ambient background orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className={`max-w-7xl mx-auto px-4 lg:px-6 relative z-10 ${
          isCompactMode ? 'py-2 space-y-2' : 'py-3 space-y-3'
        }`}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-start justify-between gap-4 flex-wrap ${
              isCompactMode ? 'pb-0' : 'pb-1'
            }`}
          >
            <div className="flex-1 min-w-0">
              <h1 className={`font-bold tracking-tight leading-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent ${
                isCompactMode ? 'text-xl' : 'text-2xl'
              }`}>
                M&E <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Tools</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Command palette trigger */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCmdOpen(true)}
                aria-label="Open command palette"
                className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl text-sm font-medium shadow-[0_4px_16px_rgba(15,23,42,0.2)] hover:shadow-[0_6px_24px_rgba(15,23,42,0.3)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Command className="w-4 h-4 relative z-10" />
                <span className="hidden sm:inline relative z-10">Commands</span>
                <kbd className="hidden sm:inline ml-1 text-xs bg-slate-800/50 text-slate-300 px-1.5 py-0.5 rounded font-mono relative z-10 border border-slate-700/50">⌘K</kbd>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Intelligence Bar ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="overflow-hidden"
          >
            <IntelligenceBar
              duplicates={duplicatePairs.length}
              high={highCount}
              medium={mediumCount}
              attLeak={cascadeData.criticalLeak}
              onChipClick={(tab) => {
                setActiveTab(tab);
                if (tab === 'integrity') {
                  setIntegrityFilter('high');
                }
              }}
            />
          </motion.div>

          {/* ── Data Health Gauge ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="overflow-hidden"
          >
            <DataHealthGauge
              healthScore={healthScore}
              highCount={highCount}
              mediumCount={mediumCount}
              onSectionClick={handleGaugeClick}
            />
          </motion.div>

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className={`sticky top-0 z-20 bg-gradient-to-b from-slate-50/95 via-slate-50/90 to-transparent backdrop-blur-xl -mx-4 lg:-mx-6 px-4 lg:px-6 ${
            isCompactMode ? 'py-1.5' : 'py-2'
          }`}>
            <div className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${
              isCompactMode ? 'p-1' : 'p-1.5'
            }`}>
              <div className="relative flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="flex-1 relative">
                    {isActive && (
                      <motion.div
                        layoutId="pill"
                        className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.2)]"
                        style={{ zIndex: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      aria-label={`Switch to ${tab.label}`}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative z-10 w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        isCompactMode ? 'px-3 py-2' : 'px-4 py-2.5'
                      }`}
                      style={{ color: isActive ? '#ffffff' : '#64748b' }}
                    >
                      {/* @ts-ignore */}
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.short}</span>
                    </motion.button>
                  </div>
                );
              })}
            </div>
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
              className={isCompactMode ? 'pb-4' : 'pb-6'}
            >
              {activeTab === 'duplicates' && (
                <DuplicateAssassin
                  pairs={duplicatePairs}
                  onDismiss={handleDismiss}
                  onViewRecord={setSelectedPatient}
                />
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
          onUpdate={() => mutate((key: any) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'))}
        />
      )}
    </HubContext.Provider>
  );
}

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
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: violations.length, color: 'text-slate-900', icon: Database, iconColor: 'text-slate-600', active: filter === 'all', onClick: () => handleFilterChange('all') },
          { label: 'High', value: highCount, color: 'text-red-600', icon: TrendingUp, iconColor: 'text-red-600', active: filter === 'high', onClick: () => handleFilterChange('high') },
          { label: 'Medium', value: medCount, color: 'text-amber-600', icon: TrendingDown, iconColor: 'text-amber-600', active: filter === 'medium', onClick: () => handleFilterChange('medium') },
        ].map((s) => {
          const StatIcon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={s.onClick}
              aria-label={`Filter by ${s.label} violations`}
              aria-pressed={s.active}
              className={`bg-white rounded-2xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                s.active ? 'border-slate-900 shadow-sm ring-1 ring-slate-900' : 'border-slate-200/60 shadow-sm hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500">{s.label} Violations</p>
                {/* @ts-ignore */}
                <StatIcon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <AnimatedNumber value={s.value} className={`text-3xl font-bold ${s.color}`} />
            </button>
          );
        })}
      </div>

      {/* Violation cards */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {filtered.map((v, i) => (
            <ViolationCard
              key={`${v.id}-${i}`}
              violation={v}
              onResolve={handleResolve}
              index={i}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && violations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-50 rounded-2xl border border-slate-200/60 p-12 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No {filter} severity violations</p>
            <p className="text-xs text-slate-500 mt-1">Try selecting a different filter</p>
          </motion.div>
        )}
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
    <div className="space-y-4">
      {/* SVG Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
