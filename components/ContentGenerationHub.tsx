'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Video, Image, Music, FileText, BarChart3, Loader2, X, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useAudioGeneration } from '@/hooks/useAudioGeneration';

type ContentType = 'video' | 'image' | 'audio' | 'report' | 'chart';

interface GenerationRequest {
  type: ContentType;
  prompt: string;
  style?: string;
  duration?: number;
}

export default function ContentGenerationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>('video');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { generate: generateVideo, videoUrl, progress: videoProgress, status: videoStatus } = useVideoGeneration();
  const { generate: generateImage, imageUrl, progress: imageProgress, status: imageStatus } = useImageGeneration();
  const { generate: generateAudio, audioUrl, progress: audioProgress, status: audioStatus } = useAudioGeneration();

  const contentTypes = [
    { id: 'video', label: 'Video', icon: Video, desc: 'Veo 3 Videos' },
    { id: 'image', label: 'Image', icon: Image, desc: 'AI Images' },
    { id: 'audio', label: 'Audio', icon: Music, desc: 'Voice/Music' },
    { id: 'report', label: 'Report', icon: FileText, desc: 'Data Reports' },
    { id: 'chart', label: 'Chart', icon: BarChart3, desc: 'Visualizations' },
  ];

  const styleOptions = {
    video: ['cinematic', 'documentary', 'animated', 'realistic', 'abstract'],
    image: ['photorealistic', 'illustration', 'oil-painting', 'watercolor', 'digital-art'],
    audio: ['professional', 'casual', 'dramatic', 'uplifting', 'ambient'],
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      const request: GenerationRequest = {
        type: activeTab as ContentType,
        prompt,
        style,
      };

      switch (activeTab) {
        case 'video':
          generateVideo(prompt);
          break;
        case 'image':
          generateImage(prompt, style);
          break;
        case 'audio':
          generateAudio(prompt, style);
          break;
        case 'report':
          // Handle report generation
          break;
        case 'chart':
          // Handle chart generation
          break;
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, style, activeTab, generateVideo, generateImage, generateAudio]);

  const currentProgress = {
    video: videoProgress,
    image: imageProgress,
    audio: audioProgress,
    report: 0,
    chart: 0,
  }[activeTab];

  const currentStatus = {
    video: videoStatus,
    image: imageStatus,
    audio: audioStatus,
    report: 'idle',
    chart: 'idle',
  }[activeTab];

  const currentUrl = {
    video: videoUrl,
    image: imageUrl,
    audio: audioUrl,
    report: null,
    chart: null,
  }[activeTab];

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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Content Generator</h2>
                  <p className="text-sm text-slate-300 mt-1">Powered by Gemini Veo 3</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Content Type Tabs */}
                <div className="grid grid-cols-5 gap-2">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = activeTab === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setActiveTab(type.id as ContentType)}
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
                  <label className="text-sm font-bold text-slate-900">Describe what you want to generate</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Describe your ${activeTab} in detail...`}
                    className="w-full h-24 p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={isGenerating}
                  />
                </div>

                {/* Style Selector */}
                {(activeTab === 'video' || activeTab === 'image' || activeTab === 'audio') && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {styleOptions[activeTab as keyof typeof styleOptions]?.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={cn(
                            'p-2 rounded-lg text-xs font-bold transition-all capitalize',
                            style === s
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {isGenerating && currentStatus !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">Generating...</span>
                      <span className="text-sm font-bold text-blue-600">{Math.round(currentProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        animate={{ width: `${currentProgress}%` }}
                        transition={{ ease: 'linear' }}
                      />
                    </div>
                  </div>
                )}

                {/* Generated Content Preview */}
                {currentUrl && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-bold text-slate-900">Generated Content</p>
                    {activeTab === 'video' && (
                      <video
                        src={currentUrl}
                        controls
                        className="w-full rounded-lg bg-black"
                      />
                    )}
                    {activeTab === 'image' && (
                      <img
                        src={currentUrl}
                        alt="Generated"
                        className="w-full rounded-lg"
                      />
                    )}
                    {activeTab === 'audio' && (
                      <audio
                        src={currentUrl}
                        controls
                        className="w-full"
                      />
                    )}
                    <div className="flex gap-2">
                      <button className="flex-1 p-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button className="flex-1 p-2 bg-slate-200 text-slate-900 rounded-lg font-bold text-sm hover:bg-slate-300 flex items-center justify-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className={cn(
                    'w-full p-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2',
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
