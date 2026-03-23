'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Maximize2, ZoomIn, ZoomOut, Hand, 
  Sun, Contrast, Layers, Download, CheckCircle2 
} from 'lucide-react';
import { Sheet, SheetContent, SheetOverlay, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEntityStore } from '@/stores/useEntityStore';
import { Z_INDEX } from '@/lib/zIndex';
import { cn } from '@/lib/utils';

export function NexusViewerModal() {
  const { selectedPatient, neuralNexusViewerOpen, setNeuralNexusViewerOpen } = useEntityStore();
  const [activeTool, setActiveTool] = useState('hand');

  const backendUrl = process.env.NEXT_PUBLIC_MED_BACKEND_URL ?? '';
  const backendSecret = process.env.NEXT_PUBLIC_MED_BACKEND_SECRET ?? '';
  const dicomSrc = selectedPatient?.dicom_path
    ? `${backendUrl}${selectedPatient.dicom_path}`
    : null;

  // Ready for Cornerstone3D: pass dicomSrc + auth header to the engine
  // cornerstoneWADOImageLoader.configure({ beforeSend: (xhr) => xhr.setRequestHeader('Authorization', `Bearer ${backendSecret}`) });
  // cornerstone.loadImage(dicomSrc).then(image => cornerstone.displayImage(element, image));

  if (!selectedPatient) return null;

  return (
    <Sheet open={neuralNexusViewerOpen} onOpenChange={setNeuralNexusViewerOpen}>
      <SheetOverlay className="bg-slate-950/60 backdrop-blur-md z-[10000]" />
      <SheetContent 
        className="p-0 border-none bg-[#0a0a0c] w-full md:max-w-7xl h-full flex flex-col z-[10001]"
      >
        <VisuallyHidden><SheetTitle>DICOM Viewer — {selectedPatient.inmate_name}</SheetTitle></VisuallyHidden>
        {/* Viewer Header */}
        <header className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-3xl">
          <div>
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-black text-white tracking-tight">{selectedPatient.inmate_name}</h2>
               <div className="px-3 py-1 bg-white/10 rounded-full">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Genki {selectedPatient.genki_score?.toFixed(2) || '0.94'}</span>
               </div>
            </div>
            <div className="flex gap-4 mt-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID: {selectedPatient.unique_id}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">DOB: 1985-04-12</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-right mr-4 hidden md:block">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Nexus Gen-4</span>
              <span className="block text-xs font-bold text-slate-300">Date: 2023-11-04</span>
            </p>
            <button 
              onClick={() => setNeuralNexusViewerOpen(false)}
              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>

        {/* The Engine (DICOM Viewer Placeholder) */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
           {/* Placeholder for Cornerstone3D */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <Layers className="w-64 h-64 text-blue-500" />
           </div>
           
           <div className="z-10 text-center px-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block p-8 bg-blue-500/10 border border-blue-500/20 rounded-[40px] backdrop-blur-3xl mb-6"
              >
                 <ImageIcon className="w-16 h-16 text-blue-500 mx-auto" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-2">Cornerstone3D Engine Mounted</h3>
              {dicomSrc ? (
                <p className="text-emerald-400 font-bold max-w-md mx-auto text-xs break-all">
                  Source: {dicomSrc}
                </p>
              ) : (
                <p className="text-slate-500 font-bold max-w-md mx-auto">Waiting for secure HTTPS source from {backendUrl || 'backend'}...</p>
              )}
           </div>

           {/* Corner Metadata Overlay */}
           <div className="absolute top-8 left-8 space-y-1">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Contrast: Gadolinium</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seq: T1_mprage_sag_p2_iso</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Thk: 1.0mm / Sp: 1.0mm</p>
           </div>

           <div className="absolute top-8 right-8 text-right space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">W: 1200 L: 400</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zoom: 1.2x</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Slice: <span className="text-blue-500">124</span> / 256</p>
           </div>

           {/* Toolbar Pill */}
           <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-3 bg-[#1a1a1e]/80 backdrop-blur-3xl border border-white/5 rounded-3xl flex items-center gap-4 shadow-2xl">
              <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolButton icon={Contrast} active={activeTool === 'contrast'} onClick={() => setActiveTool('contrast')} />
                <ToolButton icon={Sun} active={activeTool === 'brightness'} onClick={() => setActiveTool('brightness')} />
                <ToolButton icon={ZoomIn} active={activeTool === 'zoom'} onClick={() => setActiveTool('zoom')} />
                <ToolButton icon={Hand} active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} />
                <ToolButton icon={Layers} active={activeTool === 'stack'} onClick={() => setActiveTool('stack')} />
              </div>
              <div className="flex items-center gap-4 px-2 min-w-[200px]">
                <Layers className="w-4 h-4 text-blue-500" />
                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[48%] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
                </div>
                <span className="text-xs font-black text-white tabular-nums">124</span>
              </div>
           </div>
        </div>

        {/* Diagnostic Metadata Panel */}
        <div className="h-[280px] border-t border-white/5 bg-[#0f0f12] p-8 flex gap-12">
            <div className="flex-1">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">
                <Beaker className="w-3 h-3" />
                Genki AI Stratification
              </h4>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Patient identified as high-risk (0.92) due to a confluence of elevated vitals and preliminary imaging findings suggesting acute respiratory distress.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" />
                    Azure Verified
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[350px]">
               <button className="w-full h-full rounded-[32px] bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-600/20 group">
                  <Maximize2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Open Full Perspective</span>
               </button>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToolButton({ icon: Icon, active, onClick }: { icon: any, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        active ? "bg-white/10 text-blue-500 shadow-inner" : "text-slate-500 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

import { Image as ImageIcon, Beaker } from 'lucide-react';
