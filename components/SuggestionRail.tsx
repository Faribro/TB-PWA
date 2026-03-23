'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileText, Image as ImageIcon, Link as LinkIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.NEXT_PUBLIC_MED_BACKEND_URL;
const BACKEND_SECRET = process.env.NEXT_PUBLIC_MED_BACKEND_SECRET;

interface SuggestionRailProps {
  orphanedFiles: any[];
  isLoading: boolean;
}



function SkeletonChip() {
  return (
    <div className="flex-shrink-0 flex items-center gap-4 p-4 bg-white/60 border border-slate-100 rounded-2xl w-48 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-200" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2 bg-slate-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SuggestionRail({ orphanedFiles, isLoading }: SuggestionRailProps) {
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const handleManualLink = useCallback(async (patientId: string, blobName: string) => {
    if (!BACKEND_URL) { toast.error('Backend URL not configured'); return; }
    setLinkingId(blobName);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/link-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BACKEND_SECRET}`,
        },
        body: JSON.stringify({ patient_id: patientId, blob_name: blobName }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      toast.success(`Linked ${blobName} to patient`, { description: 'Emerald badge will appear shortly.' });
    } catch (err: any) {
      toast.error('Link failed', { description: err?.message ?? 'Secure tunnel may be offline.' });
    } finally {
      setLinkingId(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, blobName: string) => {
    e.preventDefault();
    const patientId = e.dataTransfer.getData('patientId');
    if (!patientId) { toast.error('Drop a patient tile onto the file to link'); return; }
    handleManualLink(patientId, blobName);
  }, [handleManualLink]);

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/40 backdrop-blur-2xl border-t border-white/20 z-[100] shadow-[0_-20px_60px_rgba(0,0,0,0.05)]">
      <div className="max-w-[1400px] mx-auto flex items-center gap-8">

        {/* Label */}
        <div className="flex items-center gap-4 border-r border-slate-200 pr-8 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Orphaned Files</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Drag patient → file to link</p>
          </div>
        </div>

        {/* File chips */}
        <div className="flex-1 flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">

          {/* Skeleton while loading */}
          {isLoading && [1, 2, 3].map(i => <SkeletonChip key={i} />)}

          {/* Live chips */}
          {!isLoading && (
            <AnimatePresence mode="popLayout">
              {orphanedFiles.map((file: any, idx: number) => {
                const isLinking = linkingId === file.name;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, file.name)}
                    className="flex-shrink-0 flex items-center gap-4 p-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm cursor-default hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
                      {isLinking
                        ? <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                        : file.type === 'DCM'
                          ? <ImageIcon className="w-5 h-5 text-cyan-500" />
                          : <FileText className="w-5 h-5 text-slate-400" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">{file.name}</p>

                      {/* State badge */}
                      {(file.state === 'extracting' || file.state === 'pending') && (
                        <div className="flex items-center gap-1 mt-1">
                          <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                          <span className="text-[10px] font-bold text-yellow-600">Processing</span>
                        </div>
                      )}
                      {(file.state === 'extracted' || file.state === 'uploaded') && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600">Complete</span>
                        </div>
                      )}

                      {/* Fuzzy match row (shown when no state badge takes priority) */}
                      {!file.state && (
                        file.match ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <LinkIcon className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-400">
                              Fuzzy Match: <span className="text-slate-600 font-black">{file.match}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1">
                            <AlertCircle className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 italic">No match detected</span>
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {!isLoading && orphanedFiles.length === 0 && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              No pending files
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
