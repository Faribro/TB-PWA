'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileSearch, Sparkles, CheckCircle2, ArrowRight, Loader2, Search, AlertCircle, Activity, FileText, Image as ImageIcon, File, ChevronDown, CloudUpload, FolderOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DiagnosticViewerSidePanel = dynamic(() => import('@/components/DiagnosticViewerSidePanel'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
      <p className="text-slate-600 text-sm font-bold">Loading Medical Engine...</p>
    </div>
  ),
});

// Secrets removed — all linking goes through the server-side proxy

interface ReconciliationQueueProps {
  orphanedFiles: any[];
  isLoading: boolean;
  patients: any[];
}

export default function ReconciliationQueue({ orphanedFiles, isLoading, patients }: ReconciliationQueueProps) {
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudies, setExpandedStudies] = useState<Set<string>>(new Set());

  // AI-powered fuzzy matching suggestions with Reasons
  const aiSuggestions = useMemo(() => {
    if (!selectedFile) return [];
    
    const filename = (selectedFile.name || '').toLowerCase();
    const matches = patients
      .map(p => {
        const name = (p.inmate_name || '').toLowerCase();
        const id = (p.unique_id || '').toLowerCase();
        
        let score = 0;
        const reasons: string[] = [];

        // 1. Exact ID Match (Primary)
        if (id && filename.includes(id)) {
          score += 0.8;
          reasons.push(`Exact ID Match (${p.unique_id})`);
        }

        // 2. Name Fragment Match
        const nameParts = name.split(/\s+/).filter(part => part.length > 2);
        let nameMatchCount = 0;
        nameParts.forEach(part => {
          if (filename.includes(part)) {
            nameMatchCount++;
          }
        });

        if (nameMatchCount > 0) {
          score += (nameMatchCount / nameParts.length) * 0.4;
          reasons.push(`Name Match (${nameMatchCount}/${nameParts.length} tokens)`);
        }

        // 3. Date Match (heuristic)
        if (selectedFile.drive_created_at && p.last_exam_date) {
            const fileDate = new Date(selectedFile.drive_created_at).toISOString().split('T')[0];
            const patientDate = new Date(p.last_exam_date).toISOString().split('T')[0];
            if (fileDate === patientDate) {
                score += 0.2;
                reasons.push('Temporal Alignment (Same Day)');
            }
        }

        return { patient: p, score: Math.min(score, 1), reasons };
      })
      .filter(m => m.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    return matches;
  }, [selectedFile, patients]);

  const handleApproveLink = useCallback(async (patientId: string, blobName: string) => {
    setIsLinking(true);
    try {
      const res = await fetch('/api/link-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, blob_name: blobName }),
        signal: AbortSignal.timeout(12_000),
      });
      
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      
      toast.success(`Linked ${blobName} to patient`, {
        description: 'File will be removed from queue shortly.',
      });
      
      setSelectedFile(null);
    } catch (err: any) {
      toast.error('Link failed', {
        description: err?.message ?? 'Secure tunnel may be offline.',
      });
    } finally {
      setIsLinking(false);
    }
  }, []);

  // Get file type icon and badge
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'dcm':
      case 'dicom':
        return { Icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'DICOM' };
      case 'pdf':
        return { Icon: FileText, color: 'text-red-600', bg: 'bg-red-50', badge: 'REPORT' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        return { Icon: ImageIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'IMAGE' };
      default:
        return { Icon: File, color: 'text-slate-500', bg: 'bg-slate-100', badge: 'DATA' };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ', ' +
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Group files by unit (patient folder view)
  const groupedStudies = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    orphanedFiles.forEach(file => {
      // SMART CONTENT ROUTING: Filter out system noise
      const name = (file.name || '').toLowerCase();
      const isNoise = name.includes('thumb') || 
                      name.includes('icon') || 
                      name.includes('_log') || 
                      name.includes('.ds_store') ||
                      name.includes('desktop.ini');
      
      if (isNoise) return;

      const unit = file.unit || 'Unassigned';
      if (!groups.has(unit)) {
        groups.set(unit, []);
      }
      groups.get(unit)!.push(file);
    });
    
    return Array.from(groups.entries()).map(([unit, files]) => ({
      unit,
      files,
      fileCount: files.length,
      hasDicom: files.some(f => f.name?.toLowerCase().endsWith('.dcm')),
      hasPdf: files.some(f => f.name?.toLowerCase().endsWith('.pdf')),
    }));
  }, [orphanedFiles]);

  const filteredStudies = useMemo(() => {
    if (!searchQuery) return groupedStudies;
    const query = searchQuery.toLowerCase();
    return groupedStudies.filter(study => 
      study.unit.toLowerCase().includes(query) ||
      study.files.some(f => f.name?.toLowerCase().includes(query))
    );
  }, [groupedStudies, searchQuery]);

  const toggleStudy = (unit: string) => {
    setExpandedStudies(prev => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 font-bold">Loading reconciliation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#F8FAFC]">
      {/* Left Panel: Study Groups */}
      <div className="w-[400px] flex-shrink-0 border-r border-slate-200/60 bg-white/80 backdrop-blur-md flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-sm">
              <FolderOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Patient Studies</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {filteredStudies.length} units · {orphanedFiles.length} files
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search studies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
            />
          </div>
        </div>

        {/* Study Groups */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredStudies.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">All studies reconciled!</p>
            </div>
          )}
          
          {filteredStudies.map((study) => {
            const isExpanded = expandedStudies.has(study.unit);
            return (
              <div key={study.unit} className="space-y-2">
                {/* Study Header */}
                <button
                  onClick={() => toggleStudy(study.unit)}
                  className="w-full p-4 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{study.unit}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {study.fileCount} files
                          </span>
                          {study.hasDicom && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-md uppercase">DCM</span>
                          )}
                          {study.hasPdf && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-md uppercase">PDF</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-slate-400 transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </button>

                {/* Expanded Files */}
                {isExpanded && (
                  <div className="ml-4 space-y-2 pl-4 border-l-2 border-slate-200">
                    {study.files.map((file: any) => {
                      const { Icon, color, bg, badge } = getFileIcon(file.name);
                      return (
                        <button
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={cn(
                            "w-full p-3 rounded-xl text-left transition-all",
                            selectedFile?.id === file.id
                              ? "bg-slate-900 text-white shadow-lg"
                              : "bg-white/60 hover:bg-white border border-slate-200/60 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              selectedFile?.id === file.id ? "bg-white/20" : bg
                            )}>
                              <Icon className={cn(
                                "w-4 h-4",
                                selectedFile?.id === file.id ? "text-white" : color
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={cn(
                                  "text-xs font-bold truncate flex-1",
                                  selectedFile?.id === file.id ? "text-white" : "text-slate-900"
                                )}>
                                  {file.name}
                                </p>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase",
                                  selectedFile?.id === file.id 
                                    ? "bg-white/20 text-white" 
                                    : "bg-slate-100 text-slate-600"
                                )}>
                                  {badge}
                                </span>
                              </div>
                              {file.drive_created_at && (
                                <div className="flex items-center gap-1.5">
                                  <CloudUpload className={cn(
                                    "w-3 h-3",
                                    selectedFile?.id === file.id ? "text-white/60" : "text-slate-400"
                                  )} />
                                  <p className={cn(
                                    "text-[10px] font-bold",
                                    selectedFile?.id === file.id ? "text-white/80" : "text-slate-500"
                                  )}>
                                    Uploaded: {formatTimestamp(file.drive_created_at)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Viewer */}
      <div className="flex-1 relative bg-[#F8FAFC]">
        {selectedFile ? (
          <DiagnosticViewerSidePanel file={selectedFile} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm flex items-center justify-center mx-auto mb-6">
                <FileSearch className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Select a file to preview</h3>
              <p className="text-sm font-medium text-slate-500">Expand a study and choose a file</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: AI Suggestions */}
      <div className="w-[400px] flex-shrink-0 border-l border-slate-200/60 bg-white/80 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Suggestions</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Fuzzy match candidates
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!selectedFile && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Select a file to see suggestions</p>
            </div>
          )}

          {selectedFile && aiSuggestions.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">No matches found</p>
              <p className="text-xs text-slate-400 mt-1">Try manual search</p>
            </div>
          )}

          {selectedFile && aiSuggestions.map(({ patient, score, reasons }) => (
            <div
              key={patient.id}
              className="p-4 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{patient.inmate_name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    ID: {patient.unique_id}
                  </p>
                </div>
                <div className="px-2 py-1 bg-amber-100 rounded-lg">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                    {Math.round(score * 100)}% Confidence
                  </span>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-1">
                {reasons.map((reason, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded border border-blue-100">
                    {reason}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleApproveLink(patient.id || patient.unique_id, selectedFile.name)}
                disabled={isLinking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Merge
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
