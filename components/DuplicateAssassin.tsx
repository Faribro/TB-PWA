'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Merge,
  X,
  Eye,
  User,
  FileText,
  Building2,
  CalendarCheck,
  Activity,
  AlertTriangle,
  Stethoscope,
  Pill,
  Microscope,
  FileSearch,
  MapPin,
  Hash,
  CheckCircle2,
  Fingerprint,
} from 'lucide-react';

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export interface Patient {
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
  hiv_status?: string;
  screening_state?: string;
  screening_district?: string;
  facility_type?: string;
  [key: string]: any;
}

export interface FieldDiff {
  key: string;
  label: string;
  valueA: any;
  valueB: any;
  isMatch: boolean;
  icon: React.ElementType;
}

export interface DuplicatePair {
  key: string;
  recordA: Patient;
  recordB: Patient;
  matchReason: string;
  confidence: number;
  sameFields: string[];
  differentFields: string[];
  fieldDiffs: FieldDiff[];
}

// ═════════════════════════════════════════════════════════════════════════════
// Configuration
// ═════════════════════════════════════════════════════════════════════════════

/** Fields to COMPARE for strict exact duplicate detection (clinical/programmatic) */
const COMPARISON_FIELDS = [
  { key: 'inmate_name', label: 'Name', icon: User },
  { key: 'facility_name', label: 'Facility', icon: Building2 },
  { key: 'age', label: 'Age', icon: Hash },
  { key: 'screening_date', label: 'Screening Date', icon: CalendarCheck },
  { key: 'tb_diagnosed', label: 'TB Diagnosed', icon: Activity },
  { key: 'xray_result', label: 'X-Ray Result', icon: FileSearch },
  { key: 'symptoms_10s', label: 'Symptoms', icon: Stethoscope },
  { key: 'att_start_date', label: 'ATT Start Date', icon: Pill },
  { key: 'referral_date', label: 'Referral Date', icon: Microscope },
  { key: 'hiv_status', label: 'HIV Status', icon: Activity },
  { key: 'screening_state', label: 'State', icon: MapPin },
  { key: 'screening_district', label: 'District', icon: MapPin },
  { key: 'facility_type', label: 'Facility Type', icon: Building2 },
];

/** ID and internal fields to EXCLUDE from comparison */
const ID_FIELDS = new Set([
  'id',
  'unique_id',
  'kobo_uuid',
  'created_at',
  'updated_at',
  'staff_name',
  'coordinator_name',
]);

// ═════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════════════════

function pairKey(a: Patient, b: Patient): string {
  return `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
}

function isExactDuplicate(a: Patient, b: Patient): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  for (const key of keys) {
    // Skip ID fields and photo fields
    if (ID_FIELDS.has(key) || key.startsWith('photo_')) continue;
    
    const va = a[key];
    const vb = b[key];
    
    // Normalize undefined/null/empty as missing
    const na = va === null || va === undefined || va === '';
    const nb = vb === null || vb === undefined || vb === '';
    
    // Both missing = match
    if (na && nb) continue;
    
    // One missing, one present = mismatch
    if (na !== nb) return false;
    
    // Both present but different values = mismatch
    if (va !== vb) return false;
  }
  
  return true;
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'string') {
    // Format dates nicely
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value);
}

function valuesEqual(a: any, b: any): boolean {
  const na = a === null || a === undefined || a === '';
  const nb = b === null || b === undefined || b === '';
  if (na && nb) return true;
  if (na !== nb) return false;
  return a === b;
}

// ═════════════════════════════════════════════════════════════════════════════
// Strict Exact Duplicate Detection Engine
// ═════════════════════════════════════════════════════════════════════════════

export interface DuplicateDetectionOptions {
  bucketByNameFacility?: boolean;
  bucketByUUID?: boolean;
}

export function detectExactDuplicates(
  patients: Patient[],
  dismissedPairs: Set<string>,
  options: DuplicateDetectionOptions = {}
): DuplicatePair[] {
  const {
    bucketByNameFacility = true,
    bucketByUUID = true,
  } = options;

  const pairs: DuplicatePair[] = [];
  if (!patients || patients.length === 0) return pairs;

  const nameFacilityMap = new Map<string, Patient[]>();
  const uuidMap = new Map<string, Patient[]>();
  const processed = new Set<string>();

  // O(N) Single Pass: Group into buckets for performance
  for (const p of patients) {
    if (bucketByUUID && p.kobo_uuid) {
      const arr = uuidMap.get(p.kobo_uuid) || [];
      arr.push(p);
      uuidMap.set(p.kobo_uuid, arr);
    }

    if (bucketByNameFacility && p.inmate_name && p.facility_name) {
      let monthKey = 'unknown_date';
      if (p.screening_date) {
        const d = new Date(p.screening_date);
        if (!isNaN(d.getTime())) {
          monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      const key = `${p.inmate_name.toLowerCase().trim()}-${p.facility_name.toLowerCase().trim()}-${monthKey}`;
      const arr = nameFacilityMap.get(key) || [];
      arr.push(p);
      nameFacilityMap.set(key, arr);
    }
  }

  // Process bucket and compute strict exact duplicates
  const processGroup = (group: Patient[]) => {
    if (group.length < 2) return;

    // Hard cap to prevent N² explosion
    const safeGroup = group.slice(0, 10);

    for (let i = 0; i < safeGroup.length; i++) {
      for (let j = i + 1; j < safeGroup.length; j++) {
        const a = safeGroup[i];
        const b = safeGroup[j];
        const key = pairKey(a, b);

        if (processed.has(key) || dismissedPairs.has(key)) continue;

        // STRICT: Only consider if ALL non-ID fields are exactly equal
        if (!isExactDuplicate(a, b)) continue;

        // Compute field-by-field diffs for UI (all should match for exact duplicates)
        const fieldDiffs: FieldDiff[] = [];
        const sameFields: string[] = [];
        const differentFields: string[] = [];

        for (const field of COMPARISON_FIELDS) {
          const isMatch = valuesEqual(a[field.key], b[field.key]);
          const diff: FieldDiff = {
            key: field.key,
            label: field.label,
            valueA: a[field.key],
            valueB: b[field.key],
            isMatch,
            icon: field.icon,
          };
          fieldDiffs.push(diff);

          if (isMatch) {
            sameFields.push(field.key);
          } else {
            differentFields.push(field.key);
          }
        }

        // STRICT EXACT DUPLICATE: confidence is always 100
        pairs.push({
          key,
          recordA: a,
          recordB: b,
          matchReason: 'Exact duplicate across all clinical fields (IDs differ)',
          confidence: 100,
          sameFields,
          differentFields,
          fieldDiffs,
        });
        processed.add(key);
      }
    }
  };

  // Process all buckets
  uuidMap.forEach((group) => processGroup(group));
  nameFacilityMap.forEach((group) => processGroup(group));

  return pairs;
}

// ═════════════════════════════════════════════════════════════════════════════
// Components
// ═════════════════════════════════════════════════════════════════════════════

// Field configuration for form display
const FORM_FIELDS: Array<{
  key: string;
  label: string;
  icon: any;
  section: 'identification' | 'clinical' | 'location';
}> = [
  // Identification
  { key: 'inmate_name', label: 'Name', icon: User, section: 'identification' },
  { key: 'unique_id', label: 'Unique ID', icon: FileText, section: 'identification' },
  { key: 'age', label: 'Age', icon: Hash, section: 'identification' },
  // Clinical status
  { key: 'facility_name', label: 'Facility', icon: Building2, section: 'clinical' },
  { key: 'screening_date', label: 'Screening Date', icon: CalendarCheck, section: 'clinical' },
  { key: 'tb_diagnosed', label: 'TB Diagnosed', icon: Activity, section: 'clinical' },
  { key: 'xray_result', label: 'X-Ray Result', icon: FileSearch, section: 'clinical' },
  { key: 'att_start_date', label: 'ATT Start Date', icon: Pill, section: 'clinical' },
  { key: 'referral_date', label: 'Referral Date', icon: Microscope, section: 'clinical' },
  { key: 'hiv_status', label: 'HIV Status', icon: Activity, section: 'clinical' },
  { key: 'symptoms_10s', label: 'Symptoms', icon: Stethoscope, section: 'clinical' },
  // Location & facility
  { key: 'screening_state', label: 'State', icon: MapPin, section: 'location' },
  { key: 'screening_district', label: 'District', icon: MapPin, section: 'location' },
  { key: 'facility_type', label: 'Facility Type', icon: Building2, section: 'location' },
];

interface DuplicateAssassinProps {
  pairs: DuplicatePair[];
  onDismiss: (pair: DuplicatePair) => void;
  onKeepA?: (pair: DuplicatePair) => void;
  onKeepB?: (pair: DuplicatePair) => void;
  onViewRecord?: (record: Patient) => void;
}

export function DuplicateAssassin({
  pairs,
  onDismiss,
  onKeepA,
  onKeepB,
  onViewRecord,
}: DuplicateAssassinProps) {
  const [idx, setIdx] = useState(0);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    setIdx((prev) => (prev >= pairs.length ? Math.max(0, pairs.length - 1) : prev));
  }, [pairs.length]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (pairs.length === 0) return;
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft') goBack();
      if (e.key === 'd' || e.key === 'D') handleDismiss();
      if (e.key === 'a' || e.key === 'A') handleKeepA();
      if (e.key === 'b' || e.key === 'B') handleKeepB();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, pairs]);

  const advance = () => setIdx((p) => Math.min(p + 1, pairs.length - 1));
  const goBack = () => setIdx((p) => Math.max(p - 1, 0));

  const handleDismiss = useCallback(() => {
    const pair = pairs[idx];
    if (!pair) return;
    setExiting('right');
    setTimeout(() => {
      onDismiss(pair);
      setExiting(null);
    }, 280);
  }, [idx, pairs, onDismiss]);

  const handleKeepA = useCallback(() => {
    const pair = pairs[idx];
    if (!pair || !onKeepA) {
      advance();
      return;
    }
    setExiting('right');
    setTimeout(() => {
      onKeepA(pair);
      setExiting(null);
    }, 280);
  }, [idx, pairs, onKeepA]);

  const handleKeepB = useCallback(() => {
    const pair = pairs[idx];
    if (!pair || !onKeepB) {
      advance();
      return;
    }
    setExiting('right');
    setTimeout(() => {
      onKeepB(pair);
      setExiting(null);
    }, 280);
  }, [idx, pairs, onKeepB]);

  if (pairs.length === 0) {
    return (
      <AllClear
        icon={Users}
        title="No Duplicates Found"
        sub="Your database is clean — no exact duplicates detected."
      />
    );
  }

  const pair = pairs[idx];
  if (!pair) return null;

  const progress = pairs.length > 0 ? ((idx + 1) / pairs.length) * 100 : 0;

  return (
    <section className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={pair.key}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="
            rounded-[26px] border bg-gradient-to-b from-white/96 to-slate-50/90 backdrop-blur-xl
            border-slate-200/70 shadow-[0_18px_70px_rgba(15,23,42,0.10)]
            px-5 py-3 md:px-6 md:py-4
            max-w-6xl mx-auto
            flex flex-col gap-3
          "
        >
          {/* Header row */}
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100/60">
            {/* Left: Title */}
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 via-violet-50 to-white text-violet-600 ring-1 ring-violet-200/50 shadow-sm">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-600">
                  Duplicate Assassin
                </span>
                <span className="text-[11px] text-slate-400 leading-tight tracking-wide">
                  {pair.recordA.inmate_name || 'Unknown'} <span className="text-slate-300">•</span> {pair.recordA.facility_name || 'Unknown facility'}
                </span>
              </div>
            </div>

            {/* Center/Right: Pair index + confidence + IDs */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="text-slate-400">Pair</span>
                <span className="font-bold text-slate-700 tabular-nums">{idx + 1}</span>
                <span className="text-slate-300">/</span>
                <span className="tabular-nums">{pairs.length}</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <ConfidenceBadge value={pair.confidence} />
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-400">ID</span>
                <span className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="text-slate-400 mr-1">A</span>{pair.recordA.id}
                </span>
                <span className="text-slate-300">/</span>
                <span className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="text-slate-400 mr-1">B</span>{pair.recordB.id}
                </span>
              </div>
            </div>
          </header>

          {/* Match reason - elevated */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50/60 via-emerald-50/40 to-transparent border border-emerald-100/60">
            <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-medium text-emerald-700/90 tracking-wide">{pair.matchReason}</span>
          </div>

          {/* Progress bar - refined */}
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-violet-500 to-violet-400 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {/* Two internal form columns - with subtle separator */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 items-start relative">
            {/* Subtle vertical divider */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200/50 to-transparent" />
            <RecordColumn
              variant="A"
              patient={pair.recordA}
              fieldDiffs={pair.fieldDiffs}
              onView={() => onViewRecord?.(pair.recordA)}
            />
            <RecordColumn
              variant="B"
              patient={pair.recordB}
              fieldDiffs={pair.fieldDiffs}
              onView={() => onViewRecord?.(pair.recordB)}
            />
          </div>

          {/* Action bar */}
          <footer className="mt-1.5 pt-2 border-t border-slate-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {/* Progress + keyboard hints */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-mono text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.5)]">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-mono text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.5)]">→</kbd>
                Navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-mono text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.5)]">A</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-mono text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.5)]">B</kbd>
                Keep
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-mono text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.5)]">D</kbd>
                Dismiss
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <CompactActionButton
                onClick={handleKeepA}
                className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white border border-blue-400/30"
                icon={<Merge className="w-3.5 h-3.5" />}
                label="Keep A"
              />
              <CompactActionButton
                onClick={handleKeepB}
                className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800 text-white border border-emerald-400/30"
                icon={<Merge className="w-3.5 h-3.5 scale-x-[-1]" />}
                label="Keep B"
              />
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <CompactActionButton
                onClick={handleDismiss}
                className="bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 active:from-slate-200 active:to-slate-300 text-slate-600 border border-slate-200/80"
                icon={<X className="w-3.5 h-3.5" />}
                label="Dismiss"
              />
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Record Column Component (inside shared shell)
// ═════════════════════════════════════════════════════════════════════════════

interface RecordColumnProps {
  variant: 'A' | 'B';
  patient: Patient;
  fieldDiffs: FieldDiff[];
  onView?: () => void;
}

function RecordColumn({ variant, patient, fieldDiffs, onView }: RecordColumnProps) {
  const isVariantA = variant === 'A';

  function getFieldStatus(key: string): 'same' | 'different' | 'unknown' {
    const diff = fieldDiffs.find((f) => f.key === key);
    if (!diff) return 'unknown';
    return diff.isMatch ? 'same' : 'different';
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={
              isVariantA
                ? 'inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 via-blue-50 to-white text-blue-600 ring-1 ring-blue-200/40 shadow-sm'
                : 'inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-600 ring-1 ring-emerald-200/40 shadow-sm'
            }
          >
            <Fingerprint className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-600 leading-none">
              {isVariantA ? 'Record A' : 'Record B'}
            </span>
            <span className="text-[9px] text-slate-400 leading-none mt-0.5 tracking-wide">Clinical snapshot</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onView}
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg hover:bg-slate-100/80 transition-all active:scale-95"
            title="View full record"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <span className={
            isVariantA
              ? 'inline-flex items-center rounded-md border border-blue-200/60 bg-gradient-to-b from-white to-blue-50/50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
              : 'inline-flex items-center rounded-md border border-emerald-200/60 bg-gradient-to-b from-white to-emerald-50/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
          }>
            {patient.id ?? '—'}
          </span>
        </div>
      </div>

      {/* Fields - with internal two-column layout */}
      <div className="space-y-1">
        {/* Identification */}
        <FormSectionTitle label="Identification" />
        <div className="space-y-1">
          {/* Name - full width */}
          <FormFieldRow
            fieldKey="inmate_name"
            label="Name"
            icon={User}
            value={formatFieldValue(patient.inmate_name)}
            status={getFieldStatus('inmate_name')}
          />
          {/* Unique ID | Age - two columns */}
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <FormFieldRow
              fieldKey="unique_id"
              label="Unique ID"
              icon={FileText}
              value={formatFieldValue(patient.unique_id)}
              status={getFieldStatus('unique_id')}
            />
            <FormFieldRow
              fieldKey="age"
              label="Age"
              icon={Hash}
              value={formatFieldValue(patient.age)}
              status={getFieldStatus('age')}
            />
          </div>
        </div>

        {/* Clinical status */}
        <FormSectionTitle label="Clinical status" />
        <div className="space-y-1">
          {/* Facility - full width */}
          <FormFieldRow
            fieldKey="facility_name"
            label="Facility"
            icon={Building2}
            value={formatFieldValue(patient.facility_name)}
            status={getFieldStatus('facility_name')}
          />
          {/* Screening Date | TB Diagnosed - two columns */}
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <FormFieldRow
              fieldKey="screening_date"
              label="Screening Date"
              icon={CalendarCheck}
              value={formatFieldValue(patient.screening_date)}
              status={getFieldStatus('screening_date')}
            />
            <FormFieldRow
              fieldKey="tb_diagnosed"
              label="TB Diagnosed"
              icon={Activity}
              value={formatFieldValue(patient.tb_diagnosed)}
              status={getFieldStatus('tb_diagnosed')}
            />
          </div>
          {/* X-Ray Result - full width */}
          <FormFieldRow
            fieldKey="xray_result"
            label="X-Ray Result"
            icon={FileSearch}
            value={formatFieldValue(patient.xray_result)}
            status={getFieldStatus('xray_result')}
          />
          {/* ATT Start Date | Referral Date - two columns */}
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <FormFieldRow
              fieldKey="att_start_date"
              label="ATT Start Date"
              icon={Pill}
              value={formatFieldValue(patient.att_start_date)}
              status={getFieldStatus('att_start_date')}
            />
            <FormFieldRow
              fieldKey="referral_date"
              label="Referral Date"
              icon={Microscope}
              value={formatFieldValue(patient.referral_date)}
              status={getFieldStatus('referral_date')}
            />
          </div>
          {/* HIV Status | Symptoms - two columns */}
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <FormFieldRow
              fieldKey="hiv_status"
              label="HIV Status"
              icon={Activity}
              value={formatFieldValue(patient.hiv_status)}
              status={getFieldStatus('hiv_status')}
            />
            <FormFieldRow
              fieldKey="symptoms_10s"
              label="Symptoms"
              icon={Stethoscope}
              value={formatFieldValue(patient.symptoms_10s)}
              status={getFieldStatus('symptoms_10s')}
            />
          </div>
        </div>

        {/* Location & facility */}
        <FormSectionTitle label="Location & facility" />
        <div className="space-y-1">
          {/* State | District - two columns */}
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <FormFieldRow
              fieldKey="screening_state"
              label="State"
              icon={MapPin}
              value={formatFieldValue(patient.screening_state)}
              status={getFieldStatus('screening_state')}
            />
            <FormFieldRow
              fieldKey="screening_district"
              label="District"
              icon={MapPin}
              value={formatFieldValue(patient.screening_district)}
              status={getFieldStatus('screening_district')}
            />
          </div>
          {/* Facility Type - full width */}
          <FormFieldRow
            fieldKey="facility_type"
            label="Facility Type"
            icon={Building2}
            value={formatFieldValue(patient.facility_type)}
            status={getFieldStatus('facility_type')}
          />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Form Section Title Component (compact)
// ═════════════════════════════════════════════════════════════════════════════

function FormSectionTitle({ label }: { label: string }) {
  return (
    <div className="mt-2 mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-400/80">
      <span className="h-px w-3 bg-slate-300/60" />
      <span className="whitespace-nowrap">{label}</span>
      <span className="h-px flex-1 bg-slate-200/50" />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Form Field Row Component (dense)
// ═════════════════════════════════════════════════════════════════════════════

interface FormFieldRowProps {
  fieldKey: string;
  label: string;
  icon: React.ElementType;
  value: string;
  status: 'same' | 'different' | 'unknown';
}

function FormFieldRow({ label, icon, value, status }: FormFieldRowProps) {
  const isSame = status === 'same';
  const isDiff = status === 'different';

  const outer =
    'flex flex-col gap-0.5 rounded-lg border px-2 py-1 text-[11px] transition-all ' +
    (isSame
      ? 'bg-emerald-50/60 border-emerald-200/60 shadow-[0_0_0_1px_rgba(16,185,129,0.06)]'
      : isDiff
      ? 'bg-amber-50/60 border-amber-200/60 shadow-[0_0_0_1px_rgba(245,158,11,0.06)]'
      : 'bg-slate-50/60 border-slate-200/70 shadow-[0_0_0_1px_rgba(148,163,184,0.04)]');

  return (
    <div className={outer}>
      <div className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.12em] uppercase text-slate-500/80">
        {icon && typeof icon === 'function' && icon({ className: "w-3 h-3 text-slate-400/70" })}
        <span>{label}</span>
      </div>
      <div className="mt-0 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-800 shadow-[0_1px_0_rgba(148,163,184,0.12),inset_0_-1px_0_rgba(148,163,184,0.08)] border border-slate-100/50">
        {value || <span className="text-slate-400/70 italic">—</span>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Confidence Badge Component
// ═════════════════════════════════════════════════════════════════════════════

function ConfidenceBadge({ value }: { value: number }) {
  const isExact = value === 100;
  const color = isExact
    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/80 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
    : value >= 90
    ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/80'
    : value >= 70
    ? 'bg-gradient-to-b from-amber-50 to-amber-100/50 text-amber-700 border-amber-200/80'
    : 'bg-gradient-to-b from-red-50 to-red-100/50 text-red-700 border-red-200/80';

  return (
    <span className={`inline-flex items-center h-5 text-[10px] font-bold px-2.5 rounded-full border ${color}`}>
      {isExact ? 'Exact' : `${value}%`}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Compact Action Button Component
// ═════════════════════════════════════════════════════════════════════════════

interface CompactActionButtonProps {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
}

function CompactActionButton({ onClick, className, icon, label }: CompactActionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -0.5 }}
      whileTap={{ scale: 0.98, y: 0 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)] ${className}`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// All Clear (Empty State) Component
// ═════════════════════════════════════════════════════════════════════════════

interface AllClearProps {
  icon: React.ElementType;
  title: string;
  sub: string;
}

function AllClear({ icon: Icon, title, sub }: AllClearProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-16 text-center"
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

export default DuplicateAssassin;
