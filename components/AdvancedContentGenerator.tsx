'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Video, Sparkles, Loader2, X, Download, Share2, Copy, RefreshCw, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';

type GenerationType = 'video' | 'description' | 'script' | 'analysis';

interface GeneratedItem {
  id: string;
  type: GenerationType;
  prompt: string;
  content: string | null;
  timestamp: number;
  status: 'generating' | 'complete' | 'error';
}

const PROMPT_TEMPLATES: Record<GenerationType, string[]> = {
  description: [
    'Write a dashboard description for TB screening data in Maharashtra',
    'Describe the SLA breach monitoring system for field workers',
  ],
  script: [
    'Write a 2-minute script explaining TB screening to rural communities',
    'Script for a training video on using the Sentinel Shield dashboard',
  ],
  analysis: [
    'Analyze why breach rates spike in Q3 across Hindi-belt states',
    'Compare screening efficiency between Maharashtra and Tamil Nadu',
  ],
  video: [
    'Cinematic overview of TB screening operations in rural India',
    'Data visualization of district-level breach rates across India',
  ],
};

export default function AdvancedContentGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GenerationType>('video');
  const [prompt, setPrompt] = useState('');
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const fullTextRef = useRef('');
  const lastPromptRef = useRef('');

  const { generate: generateVideo, videoUrl, progress: videoProgress, status: videoStatus } = useVideoGeneration();
  const { generate: generateStream, text: streamText, status: streamStatus, stop: stopStream, reset: resetStream } = useStreamingGeneration();

  const generationTypes = [
    { id: 'video', label: 'Video', icon: Video, desc: 'Veo 3 Videos' },
    { id: 'description', label: 'Description', icon: Sparkles, desc: 'AI Descriptions' },
    { id: 'script', label: 'Script', icon: Sparkles, desc: 'Video Scripts' },
    { id: 'analysis', label: 'Analysis', icon: Sparkles, desc: 'Data Analysis' },
  ];

  // Sync full text ref whenever stream text updates (Issue 2 fix)
  useEffect(() => {
    fullTextRef.current = streamText;
  }, [streamText]);

  // Update streaming content in real-time
  useEffect(() => {
    if (!currentItemId) return;

    setGeneratedItems((prev) =>
      prev.map((item) =>
        item.id === currentItemId
          ? {
              ...item,
              content: fullTextRef.current,
              status: streamStatus === 'streaming' ? 'generating' : streamStatus === 'complete' ? 'complete' : streamStatus === 'error' ? 'error' : 'generating',
            }
          : item
      )
    );

    if (streamStatus === 'complete' || streamStatus === 'error') {
      setIsGenerating(false);
      setCurrentItemId(null);
    }
  }, [currentItemId, streamStatus]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    const itemId = Date.now().toString();
    setCurrentItemId(itemId);
    lastPromptRef.current = prompt;

    const newItem: GeneratedItem = {
      id: itemId,
      type: activeTab,
      prompt,
      content: null,
      timestamp: Date.now(),
      status: 'generating',
    };

    setGeneratedItems((prev) => [newItem, ...prev]);

    if (activeTab === 'video') {
      generateVideo(prompt);
      setIsGenerating(false);
    } else {
      resetStream();
      generateStream(prompt, activeTab);
    }

    setPrompt('');
  }, [prompt, activeTab, generateVideo, generateStream, resetStream]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadContent = (item: GeneratedItem) => {
    if (!item.content) return;

    const element = document.createElement('a');
    const file = new Blob([item.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${item.type}-${item.timestamp}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Zap className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Advanced Content Generator</h2>
                  <p className="text-sm text-slate-300 mt-1">Real-time streaming with Gemini 2.0-Flash</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Generation Type Tabs */}
                <div className="grid grid-cols-4 gap-2">
                  {generationTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = activeTab === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setActiveTab(type.id as GenerationType)}
                        className={cn(
                          'p-3 rounded-lg transition-all flex flex-col items-center gap-2',
                          isActive
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-900">
                    What would you like to generate?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Describe your ${activeTab} in detail...`}
                    className="w-full h-24 p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={isGenerating}
                  />

                  {/* Prompt Templates */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PROMPT_TEMPLATES[activeTab].map((tpl) => (
                      <button
                        key={tpl}
                        onClick={() => setPrompt(tpl)}
                        className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 hover:bg-cyan-500/20 transition-all"
                      >
                        {tpl.length > 40 ? tpl.slice(0, 40) + '...' : tpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={cn(
                      'flex-1 p-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2',
                      isGenerating || !prompt.trim()
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg'
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                      </>
                    )}
                  </button>
                  {isGenerating && streamStatus === 'streaming' && (
                    <button
                      onClick={stopStream}
                      className="px-4 py-3 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  )}
                </div>

                {/* Generated Items History */}
                {generatedItems.length > 0 && (
                  <div className="space-y-3 border-t pt-6">
                    <h3 className="text-sm font-bold text-slate-900">Generated Content</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {generatedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-500 uppercase">
                                {item.type}
                              </p>
                              <p className="text-sm text-slate-700 mt-1 line-clamp-2">
                                {item.prompt}
                              </p>
                            </div>
                            {item.status === 'generating' && (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 ml-2" />
                            )}
                            {item.status === 'error' && (
                              <span className="text-xs font-bold text-red-600 ml-2">ERROR</span>
                            )}
                          </div>

                          {item.content && (
                            <>
                              <div className="bg-white p-3 rounded border border-slate-200 mb-3 max-h-32 overflow-y-auto">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                                  {item.content}
                                  {item.status === 'generating' && (
                                    <motion.span
                                      animate={{ opacity: [1, 0, 1] }}
                                      transition={{ duration: 0.6, repeat: Infinity }}
                                      className="inline-block w-2 h-4 bg-cyan-400 ml-1 align-middle"
                                    />
                                  )}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(item.content || '')}
                                  className="flex-1 p-2 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200 flex items-center justify-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                                <button
                                  onClick={() => downloadContent(item)}
                                  className="flex-1 p-2 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300 flex items-center justify-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
