'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileImage, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface RegisterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function RegisterUploadModal({ isOpen, onClose, onSuccess }: RegisterUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

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

  const handleImageUpload = async (file: File) => {
    setUploadState('uploading');
    setProgress(30);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setProgress(50);

        const response = await fetch('/api/register-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        setProgress(80);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'OCR extraction failed');
        }

        const result = await response.json();
        setProgress(100);
        setUploadState('success');
        toast.success(`Extracted ${result.extractedRows?.length || 0} patients`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      };

      reader.onerror = () => {
        throw new Error('Failed to read image file');
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      setUploadState('error');
      setErrorMessage(error.message || 'Upload failed');
      toast.error(error.message || 'Upload failed');
    }
  };

  const handleExcelUpload = async (file: File) => {
    setUploadState('uploading');
    setProgress(30);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      setProgress(50);

      // Cast age to Number (critical for schema compliance)
      const sanitizedData = jsonData.map((row: any) => ({
        ...row,
        age: row.age ? Number(row.age) : null,
      }));

      const response = await fetch('/api/register-reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: sanitizedData }),
      });

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Reconciliation failed');
      }

      const result = await response.json();
      setProgress(100);
      setUploadState('success');
      toast.success(`Processed ${result.processed || 0} rows`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error: any) {
      setUploadState('error');
      setErrorMessage(error.message || 'Upload failed');
      toast.error(error.message || 'Upload failed');
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');

    if (!isImage && !isExcel) {
      toast.error('Only images (.jpg, .png) or Excel files (.xlsx, .csv) are supported');
      return;
    }

    if (isImage) {
      await handleImageUpload(file);
    } else {
      await handleExcelUpload(file);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');

    if (isImage) {
      await handleImageUpload(file);
    } else {
      await handleExcelUpload(file);
    }
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
                      accept="image/*,.xlsx,.csv"
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
                          Supports .jpg, .png, .xlsx, .csv
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
                  <div className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">Processing...</p>
                      <p className="text-xs text-slate-500 mt-1">Please wait</p>
                    </div>
                    <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-blue-600 rounded-full"
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
