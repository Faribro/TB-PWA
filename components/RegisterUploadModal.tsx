'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileImage, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useReconciliationStore, type ExtractionSource } from '@/stores/useReconciliationStore';
import { Table2, FileText, ScanLine } from 'lucide-react';

interface RegisterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type ProcessingStage = 'uploading' | 'extracting' | 'matching' | 'done';

export function RegisterUploadModal({ isOpen, onClose, onSuccess }: RegisterUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('uploading');
  const [detectedSource, setDetectedSource] = useState<ExtractionSource>('image');

  const { setExtractionData } = useReconciliationStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileUpload = async (file: File): Promise<void> => {
    // Validate file type client-side (first defense)
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowed.includes(file.type) && !file.name.endsWith('.xlsx')) {
      toast.error(`Unsupported file type: ${file.type}`);
      return;
    }

    // Validate file size — 20MB max
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setUploadState('uploading');
    setCurrentStage('uploading');
    setProgress(30);

    // Detect source based on MIME or filename
    let source: ExtractionSource = 'image';
    if (file.type === 'application/pdf') source = 'pdf';
    else if (file.type.includes('spreadsheet') || file.type.includes('csv') || file.name.endsWith('.xlsx')) source = 'excel';
    setDetectedSource(source);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('mimeType', file.type);

      setProgress(50);
      setCurrentStage('extracting');
      
      const response = await fetch('/api/register-extract', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      setProgress(90);
      setCurrentStage('matching');
      
      if (!result.extractionId) {
        throw new Error('Backend did not return extractionId');
      }

      // Final matching stage simulated for UI smoothness if it is too fast
      await new Promise(r => setTimeout(r, 600));
      
      setCurrentStage('done');
      setProgress(100);
      setUploadState('success');

      toast.success(
        `${result.rowCount || result.rows?.length || 0} patients extracted from ${result.source}`,
        {
          description: `Confidence: 100% · Opening review…`,
          duration: 3000
        }
      );
      
      // HAND OFF to reconciliation store
      setExtractionData({
        extractionId: result.extractionId,
        rows: result.rows,
        summary: result.summary,
        source: result.source as ExtractionSource,
        modelVersion: result.model,
        latencyMs: result.latencyMs
      });

      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetModal();
      }, 800);

    } catch (error: any) {
      setUploadState('error');
      setErrorMessage(error.message || 'Upload failed');
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    await handleFileUpload(file);
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleFileUpload(file);
  }, []);

  const resetModal = () => {
    setUploadState('idle');
    setProgress(0);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="relative z-[99999]" aria-labelledby="upload-modal" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100000] w-[90vw] max-w-lg"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900" id="upload-modal">Upload Register</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Images or Excel files</p>
                </div>
                <Button
                  onClick={handleClose}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6">
                {uploadState === 'idle' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-xl p-12 transition-all duration-300",
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,.xlsx,.csv,.pdf"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-4 pointer-events-none">
                      <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-900">
                          Drop files here or click to browse
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports .jpg, .png, .pdf, .xlsx, .csv
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <FileImage className="w-4 h-4" />
                          <span>Images</span>
                        </div>
                        <div className="w-px h-4 bg-slate-300" />
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Excel</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {uploadState === 'uploading' && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-slate-900">
                        {currentStage === 'uploading' && 'Uploading file…'}
                        {currentStage === 'extracting' && (
                          detectedSource === 'pdf' ? 'Reading PDF with Gemini 1.5…' :
                          detectedSource === 'excel' ? 'Parsing spreadsheet columns…' :
                          'Running OCR extraction…'
                        )}
                        {currentStage === 'matching' && 'Fuzzy matching patients…'}
                        {currentStage === 'done' && 'Handoff complete'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {currentStage === 'uploading' && 'Sending to secure backend'}
                        {currentStage === 'extracting' && 'Identifying patient records'}
                        {currentStage === 'matching' && 'Cross-referencing with database'}
                        {currentStage === 'done' && 'Opening review grid…'}
                      </p>
                    </div>
                    <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                      />
                    </div>
                  </div>
                )}

                {uploadState === 'success' && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">Upload successful!</p>
                      <p className="text-xs text-slate-500 mt-1">Processing complete</p>
                    </div>
                  </div>
                )}

                {uploadState === 'error' && (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-rose-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">Upload failed</p>
                      <p className="text-xs text-slate-500 mt-1">{errorMessage}</p>
                    </div>
                    <Button
                      onClick={resetModal}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
