'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

interface SecurePDFViewerProps {
  url: string;
  authToken?: string;
  fileName?: string;
}

export default function SecurePDFViewer({ url, authToken, fileName }: SecurePDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function fetchPDF() {
      if (!url) return;
      setIsLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch specialist report: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (blob.type !== 'application/pdf' && !url.toLowerCase().endsWith('.pdf')) {
          console.warn('[SecurePDFViewer] Blob type mismatch:', blob.type);
        }

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err: any) {
        console.error('[SecurePDFViewer] Error:', err);
        setError(err.message || 'Failed to load medical report');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPDF();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, authToken]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-md">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-white font-black text-xs uppercase tracking-[0.2em]">
          Decrypting Medical Report...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="text-center px-8 border border-white/10 p-8 rounded-[32px] bg-white/5 backdrop-blur-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">Access Denied</h3>
          <p className="text-red-400 font-bold text-sm mb-4">{error}</p>
          <div className="text-left bg-black/40 border border-white/5 rounded-xl p-4 max-w-md">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Context</p>
            <p className="text-xs text-slate-400 font-mono break-all">{url}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-100 flex flex-col">
      {/* Heavy Clinical Header for PDF */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <FileText className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Specialist Report</p>
            <h4 className="text-xs font-black text-slate-900 mt-1">{fileName || 'Report.pdf'}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase tracking-widest border border-emerald-100">
                Authorized Access
            </span>
        </div>
      </div>
      
      {/* PDF Viewport */}
      <div className="flex-1 w-full bg-slate-200 overflow-hidden relative">
        {pdfUrl && (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full h-full border-0"
            title={fileName || 'Medical Report'}
          />
        )}
      </div>
    </div>
  );
}
