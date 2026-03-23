'use client';

import { useState, useEffect } from 'react';
import { Layers, FileText, ZoomIn, ZoomOut, Hand, Contrast, Download, RotateCw, Maximize2, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const CornerstoneViewer = dynamic(() => import('@/components/CornerstoneViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-black">
      <p className="text-white text-sm font-bold opacity-30 animate-pulse tracking-widest uppercase">Initializing Medical Engine...</p>
    </div>
  ),
});

const SecurePDFViewer = dynamic(() => import('@/components/SecurePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <p className="text-white text-sm font-bold opacity-30 animate-pulse tracking-widest uppercase tracking-[0.2em]">Loading Secure Specialist Report...</p>
    </div>
  ),
});

// ⚠️  No secrets here. MED_BACKEND_SECRET lives only in /api/secure-dicom (server-side).

interface DiagnosticViewerSidePanelProps {
  file: any;
}

export default function DiagnosticViewerSidePanel({ file }: DiagnosticViewerSidePanelProps) {
  const [activeTool, setActiveTool] = useState('hand');
  const [windowPreset, setWindowPreset] = useState<'lung' | 'bone' | 'soft' | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const fileType = file.type?.toUpperCase() || 'UNKNOWN';
  const isDICOM = fileType === 'DCM' || fileType === 'DICOM';
  const isPDF = fileType === 'PDF';
  const isImage = ['JPG', 'JPEG', 'PNG'].includes(fileType);

  const patientName = file.patient_name || file.unit || 'Unknown Patient';
  const studyDate = file.drive_created_at
    ? new Date(file.drive_created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Unknown Date';

  // If the file object already carries a pre-signed URL use it directly.
  // Otherwise call the server-side proxy — the backend secret never reaches the client.
  useEffect(() => {
    setResolvedUrl(null);
    setUrlError(null);

    if (file.url) {
      setResolvedUrl(file.url);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/secure-dicom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name }),
          signal: AbortSignal.timeout(12_000),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.fileUrl) setResolvedUrl(data.fileUrl);
        else setUrlError(data.error ?? 'Failed to resolve file URL');
      } catch (err: any) {
        if (!cancelled) setUrlError(err.message);
      }
    })();

    return () => { cancelled = true; };
  }, [file.url, file.name]);

  // ── Loading state while proxy resolves URL ──────────────────────────────────
  if (!resolvedUrl && !urlError) {
    return (
      <div className="h-full flex flex-col bg-[#F8FAFC]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resolving secure URL...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (urlError) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center px-8">
          <FileText className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-red-600">{urlError}</p>
        </div>
      </div>
    );
  }

  const fileUrl = resolvedUrl!;

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* Viewer Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{file.name}</h3>
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Type: {fileType}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              State: {file.state || 'Pending'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4 pr-4 border-r border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Clinic Status</p>
            <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[9px] font-black text-blue-700 uppercase">
              {file.state || 'AWAITING_TRIAGE'}
            </div>
          </div>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-blue-400 transition-all shadow-sm group">
            <Download className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>
      </header>

      {/* Viewer Content */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isDICOM && (
          <>
            <CornerstoneViewer fileUrl={fileUrl} />

            {/* Patient HUD */}
            <div className="absolute top-4 left-4 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-none">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Patient Study</p>
              <p className="text-sm font-black text-white">{patientName}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Study Date: {studyDate}
              </p>
            </div>

            {/* Floating Glass Dock */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl flex items-center gap-2 shadow-2xl">
              <div className="flex items-center gap-1 pr-3 border-r border-slate-200">
                <WindowButton label="Lung" active={windowPreset === 'lung'} onClick={() => setWindowPreset('lung')} />
                <WindowButton label="Bone" active={windowPreset === 'bone'} onClick={() => setWindowPreset('bone')} />
                <WindowButton label="Soft" active={windowPreset === 'soft'} onClick={() => setWindowPreset('soft')} />
              </div>
              <ToolButton icon={Contrast} active={activeTool === 'contrast'} onClick={() => setActiveTool('contrast')} />
              <ToolButton icon={ZoomIn}   active={activeTool === 'zoom'}     onClick={() => setActiveTool('zoom')} />
              <ToolButton icon={Hand}     active={activeTool === 'hand'}     onClick={() => setActiveTool('hand')} />
              <ToolButton icon={RotateCw} active={activeTool === 'rotate'}   onClick={() => setActiveTool('rotate')} />
              <ToolButton icon={Maximize2} active={activeTool === 'reset'}   onClick={() => setActiveTool('reset')} />
            </div>
          </>
        )}

        {isPDF && <SecurePDFViewer url={fileUrl} fileName={file.name} />}

        {isImage && (
          <div className="h-full flex items-center justify-center p-8 bg-[#F8FAFC]">
            <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          </div>
        )}

        {!isDICOM && !isPDF && !isImage && (
          <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
            <div className="text-center">
              <div className="inline-block p-8 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[40px] shadow-sm mb-6">
                <FileText className="w-16 h-16 text-slate-400 mx-auto" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Unsupported Format</h3>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                {fileType} files cannot be previewed in the viewer
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="h-[120px] border-t border-slate-200/60 bg-white/80 backdrop-blur-md p-4">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">File Metadata</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500 font-bold">Filename:</span>
            <span className="text-slate-900 font-bold ml-2 truncate block">{file.name}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold">Type:</span>
            <span className="text-slate-900 font-bold ml-2">{fileType}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold">State:</span>
            <span className="text-slate-900 font-bold ml-2">{file.state || 'Pending'}</span>
          </div>
          {file.drive_created_at && (
            <div>
              <span className="text-slate-500 font-bold">Uploaded:</span>
              <span className="text-slate-900 font-bold ml-2">{studyDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, active, onClick }: { icon: any; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
        active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function WindowButton({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
        active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      {label}
    </button>
  );
}
