/**
 * components/RegisterUploadModal.tsx
 *
 * 3-step guided flow for date-scoped register reconciliation:
 *   Step 1 — Confirm Context (date, facility, scope)
 *   Step 2 — Upload & Parse (file drop, validation, progress)
 *   Step 3 — Review Handoff (extraction summary → reconciliation)
 *
 * Context flows from Vertex → this modal → store → API.
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Calendar, Building2, MapPin, ChevronRight, Shield,
  AlertTriangle, FileWarning, RotateCcw, ArrowRight, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useReconciliationStore } from '@/stores/useReconciliationStore';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════

interface RegisterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;

  /** From Vertex context */
  screeningDate?: string | null;
  facilityName?: string | null;
  screeningDistrict?: string | null;
  screeningState?: string | null;
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not selected';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════

export function RegisterUploadModal({
  isOpen,
  onClose,
  onSuccess,
  screeningDate,
  facilityName,
  screeningDistrict,
  screeningState,
}: RegisterUploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const store = useReconciliationStore();

  const hasDate = !!screeningDate;
  const scopeMode = facilityName ? 'date_facility' : 'date_only';

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep(1);
    setSelectedFile(null);
    setIsExtracting(false);
    setExtractionResult(null);
    setExtractionError(null);
    setIsDragOver(false);
    onClose();
  }, [onClose]);

  // ═══════════════════════════════════════════════════════
  // File Handling
  // ═══════════════════════════════════════════════════════

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.toLowerCase().split('.').pop();
    const isValidType = ACCEPTED_TYPES.includes(file.type) ||
      ACCEPTED_EXTENSIONS.some(e => file.name.toLowerCase().endsWith(e));

    if (!isValidType) {
      return `Unsupported file type. Only .xlsx and .csv files are accepted.`;
    }
    if (file.size > 20 * 1024 * 1024) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 20 MB.`;
    }
    if (file.size === 0) {
      return 'File is empty.';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setExtractionError(error);
      return;
    }
    setSelectedFile(file);
    setExtractionError(null);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ═══════════════════════════════════════════════════════
  // Extraction
  // ═══════════════════════════════════════════════════════

  const handleExtract = useCallback(async () => {
    if (!selectedFile || !screeningDate) return;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('screeningDate', screeningDate);
      if (facilityName) formData.append('facilityName', facilityName);
      if (screeningDistrict) formData.append('screeningDistrict', screeningDistrict);
      if (screeningState) formData.append('screeningState', screeningState);
      formData.append('scopeMode', scopeMode);

      const res = await fetch('/api/register-extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }

      const result = await res.json();
      setExtractionResult(result);
      setStep(3);
    } catch (error) {
      setExtractionError(
        error instanceof Error ? error.message : 'Extraction failed',
      );
    } finally {
      setIsExtracting(false);
    }
  }, [selectedFile, screeningDate, facilityName, screeningDistrict, screeningState, scopeMode]);

  // ═══════════════════════════════════════════════════════
  // Handoff to Reconciliation
  // ═══════════════════════════════════════════════════════

  const handleProceedToReview = useCallback(() => {
    if (!extractionResult || !screeningDate) return;

    // Initialize store with session context
    store.startSession({
      selectedDate: screeningDate,
      facilityName: facilityName ?? null,
      screeningDistrict: screeningDistrict ?? null,
      screeningState: screeningState ?? null,
      scopeMode: scopeMode as any,
    });

    // Set file for reference
    if (selectedFile) {
      store.setFile(selectedFile);
    }

    // Set parsed rows
    store.setParsedRows({
      extractionId: extractionResult.extractionId,
      matchResults: extractionResult.results,
      summary: extractionResult.summary,
      parseWarnings: extractionResult.warnings,
      source: 'spreadsheet',
      latencyMs: extractionResult.latencyMs,
    });

    toast.success('Register parsed — review and confirm matches', {
      duration: 3000,
    });

    handleClose();
    onSuccess?.();
  }, [extractionResult, screeningDate, facilityName, screeningDistrict, screeningState, scopeMode, selectedFile, store, handleClose, onSuccess]);

  // ═══════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Register Reconciliation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Step {step} of 3 — {step === 1 ? 'Confirm Scope' : step === 2 ? 'Upload File' : 'Review & Proceed'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    'h-1.5 rounded-full flex-1 transition-all duration-500',
                    s <= step ? 'bg-blue-600' : 'bg-slate-200',
                  )} />
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ═══════════════════════════════════════════════ */}
              {/* STEP 1: Confirm Context                        */}
              {/* ═══════════════════════════════════════════════ */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {!hasDate ? (
                    /* No date selected — block */
                    <div className="text-center py-8 space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-7 h-7 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Select a Date First
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                          To reconcile a register, first select a screening date in the calendar.
                          This ensures records are created with the correct historical date.
                        </p>
                      </div>
                      <Button
                        onClick={handleClose}
                        variant="outline"
                        className="mt-2 rounded-xl font-bold text-xs uppercase tracking-widest"
                      >
                        Go Back to Calendar
                      </Button>
                    </div>
                  ) : (
                    /* Date selected — show scope */
                    <>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest">
                          <Shield className="w-3.5 h-3.5" />
                          Reconciliation Scope
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-800">
                              {formatDate(screeningDate)}
                            </span>
                          </div>

                          {facilityName && (
                            <div className="flex items-center gap-3 text-sm">
                              <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-700">
                                {facilityName}
                              </span>
                            </div>
                          )}

                          {(screeningDistrict || screeningState) && (
                            <div className="flex items-center gap-3 text-sm">
                              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="font-medium text-slate-600">
                                {[screeningDistrict, screeningState].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-700">Scope Context:</strong>
                        <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-500">
                          <li><strong>Date:</strong> {formatDate(screeningDate)}</li>
                          {facilityName && <li><strong>Facility:</strong> {facilityName}</li>}
                          {screeningDistrict && <li><strong>District:</strong> {screeningDistrict}</li>}
                          {screeningState && <li><strong>State:</strong> {screeningState}</li>}
                          <li><strong>Mode:</strong> {scopeMode === 'date_facility' ? 'Date + Facility' : 'Date Only'}</li>
                        </ul>
                        <p className="mt-2 text-[10px] text-slate-400">
                          Only existing patients matching this scope will be considered for matching.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-700">How this works:</strong>
                        <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-500">
                          <li>Upload your Excel or CSV register file</li>
                          <li>System matches <em>only</em> against existing inmates for <strong>{formatDate(screeningDate)}</strong>{facilityName ? ` at ${facilityName}` : ''}</li>
                          <li>If no inmates exist for this date, all rows are treated as new</li>
                          <li>Matching never searches outside the selected date{facilityName ? ' and facility' : ''}</li>
                          <li>New records will use <strong>{formatDate(screeningDate)}</strong> as screening date</li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-bold px-2.5 py-1',
                            scopeMode === 'date_facility'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200',
                          )}
                        >
                          {scopeMode === 'date_facility' ? '📍 Date + Facility Scope' : '📅 Date Scope'}
                        </Badge>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP 2: Upload & Parse                         */}
              {/* ═══════════════════════════════════════════════ */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Context reminder */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-xs text-blue-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(screeningDate)}
                    {facilityName && (
                      <>
                        <span className="text-blue-300">·</span>
                        <Building2 className="w-3.5 h-3.5" />
                        {facilityName}
                      </>
                    )}
                  </div>

                  {/* File Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300',
                      isDragOver
                        ? 'border-blue-400 bg-blue-50/50 scale-[1.01]'
                        : selectedFile
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />

                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setExtractionResult(null);
                            setExtractionError(null);
                          }}
                          className="text-xs text-slate-400 hover:text-red-500 underline mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          Drop your register file here
                        </p>
                        <p className="text-xs text-slate-400">
                          Accepts .xlsx and .csv · Max 20 MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Extraction Error */}
                  {extractionError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{extractionError}</p>
                    </div>
                  )}

                  {/* Extract Button */}
                  {selectedFile && (
                    <Button
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className={cn(
                        'w-full h-12 rounded-xl font-bold text-sm transition-all',
                        isExtracting
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50',
                      )}
                    >
                      {isExtracting ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin mr-2" />
                          Parsing & Matching...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Parse Register
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* STEP 3: Review Handoff                         */}
              {/* ═══════════════════════════════════════════════ */}
              {step === 3 && extractionResult && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Success Header */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Register Parsed</h3>
                    <p className="text-xs text-slate-500">
                      {extractionResult.rowCount} rows matched against{' '}
                      {formatDate(screeningDate)}{facilityName ? ` · ${facilityName}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {extractionResult.summary?.scopedCandidateCount ?? 0} existing patients in scope
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="p-3 text-center bg-emerald-50 border-emerald-100">
                      <p className="text-2xl font-black text-emerald-700">
                        {extractionResult.summary?.autoMatch ?? 0}
                      </p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                        Matched
                      </p>
                    </Card>
                    <Card className="p-3 text-center bg-amber-50 border-amber-100">
                      <p className="text-2xl font-black text-amber-700">
                        {extractionResult.summary?.needsReview ?? 0}
                      </p>
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                        Review
                      </p>
                    </Card>
                    <Card className="p-3 text-center bg-blue-50 border-blue-100">
                      <p className="text-2xl font-black text-blue-700">
                        {extractionResult.summary?.newRecord ?? 0}
                      </p>
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">
                        New
                      </p>
                    </Card>
                  </div>

                  {/* Scope mismatch warning */}
                  {screeningState && screeningDistrict && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700">
                        <p className="font-bold">Scope Context Applied</p>
                        <p className="mt-1">
                          Matching is restricted to <strong>{screeningState}</strong> · <strong>{screeningDistrict}</strong>
                          {facilityName && ` · ${facilityName}`}. If your uploaded data is from a different location, it will not match existing records.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Empty-scope warning */}
                  {extractionResult.summary?.isEmptyScope && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-700">
                        <p className="font-bold">No existing inmates found for this date and facility</p>
                        <p className="mt-1">All {extractionResult.summary.newRecord} rows will be treated as new records. If you believe this data already exists, check the screening date and facility name.</p>
                      </div>
                    </div>
                  )}

                  {/* Duplicate warning */}
                  {(extractionResult.summary?.duplicateInFile > 0 || extractionResult.summary?.duplicateInScope > 0) && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <FileWarning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700">
                        {extractionResult.summary.duplicateInFile > 0 && (
                          <p><strong>{extractionResult.summary.duplicateInFile}</strong> duplicate(s) found within uploaded file</p>
                        )}
                        {extractionResult.summary.duplicateInScope > 0 && (
                          <p><strong>{extractionResult.summary.duplicateInScope}</strong> record(s) already exist in this scope</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Parse warnings */}
                  {extractionResult.warnings?.length > 0 && (
                    <div className="space-y-1">
                      {extractionResult.warnings.map((w: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                          <AlertTriangle className="w-3 h-3 text-slate-400" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proceed to Review */}
                  <Button
                    onClick={handleProceedToReview}
                    className="w-full h-12 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50"
                  >
                    Open Reconciliation Review
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (step === 3) {
                    setStep(2);
                    setExtractionResult(null);
                  } else {
                    setStep((step - 1) as 1 | 2);
                  }
                }}
                className="text-xs font-bold text-slate-500"
              >
                ← Back
              </Button>
            ) : (
              <div />
            )}

            {step === 1 && hasDate && (
              <Button
                onClick={() => setStep(2)}
                className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
              >
                Continue
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
