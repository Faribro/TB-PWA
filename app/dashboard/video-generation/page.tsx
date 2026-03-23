'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertCircle } from 'lucide-react';
import SonicDisplayTV from '@/components/SonicDisplayTV';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { cn } from '@/lib/utils';

export default function VideoGenerationPage() {
  const { generate, videoUrl, progress, status, error, reset } = useVideoGeneration();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    generate(prompt);
    setIsSubmitting(false);
  };

  const handleReset = () => {
    reset();
    setPrompt('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Neural Video Generator
          </h1>
          <p className="text-cyan-300/60 font-share-tech tracking-widest uppercase">
            Powered by Google Gemini Veo 2
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* VIDEO DISPLAY */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <SonicDisplayTV
                isEmbedded={true}
                videoUrl={videoUrl || undefined}
                progress={progress}
                title="Veo 2 Neural Analysis"
              />
            </motion.div>
          </div>

          {/* CONTROL PANEL */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* PROMPT INPUT */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                <label className="block text-xs font-black text-cyan-300 uppercase tracking-widest mb-3">
                  Video Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={status === 'generating' || status === 'starting'}
                  placeholder="Describe the video you want to generate..."
                  className="w-full h-24 bg-slate-950/50 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 resize-none"
                />
              </div>

              {/* STATUS INDICATOR */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      status === 'idle' && 'bg-slate-400',
                      status === 'starting' && 'bg-yellow-400 animate-pulse',
                      status === 'generating' && 'bg-cyan-400 animate-pulse',
                      status === 'complete' && 'bg-emerald-400',
                      status === 'error' && 'bg-red-400'
                    )}
                  />
                  <span className="text-xs font-black text-white uppercase tracking-tight">
                    {status === 'idle' && 'Ready'}
                    {status === 'starting' && 'Starting...'}
                    {status === 'generating' && 'Generating...'}
                    {status === 'complete' && 'Complete'}
                    {status === 'error' && 'Error'}
                  </span>
                </div>

                {/* PROGRESS BAR */}
                {status === 'generating' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-300/60 font-share-tech tracking-widest uppercase">
                        Processing
                      </span>
                      <span className="text-xs font-bold text-cyan-400">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-cyan-950/40 rounded-full overflow-hidden border border-cyan-500/20">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                      />
                    </div>
                  </div>
                )}

                {/* ERROR MESSAGE */}
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={
                    !prompt.trim() ||
                    status === 'generating' ||
                    status === 'starting'
                  }
                  className={cn(
                    'w-full py-3 rounded-xl font-black uppercase tracking-tight text-sm transition-all flex items-center justify-center gap-2',
                    status === 'generating' || status === 'starting'
                      ? 'bg-cyan-500/30 text-cyan-300 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Generate Video
                </motion.button>

                {status === 'complete' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="w-full py-3 rounded-xl font-black uppercase tracking-tight text-sm bg-slate-700 hover:bg-slate-600 text-white transition-all"
                  >
                    Generate Another
                  </motion.button>
                )}
              </div>

              {/* INFO BOX */}
              <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4">
                <p className="text-[10px] text-cyan-300/60 font-share-tech tracking-widest uppercase mb-2">
                  How it works
                </p>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  <li>• Enter a detailed video description</li>
                  <li>• Click Generate to start processing</li>
                  <li>• Watch real-time progress updates</li>
                  <li>• Video plays automatically when ready</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
