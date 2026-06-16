'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Polyfill types for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function VoiceInput({ value, onChange, placeholder = 'Speak or type...', className = '', rows = 3 }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    
    if (!SpeechRecognition) {
      setHasSupport(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // We capture interim for real-time feel if needed
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorStatus(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        onChange((value ? value + ' ' : '') + finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setErrorStatus(`Microphone error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onChange, value]);

  const toggleListening = () => {
    if (!hasSupport) {
      setErrorStatus("Voice synthesis not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  };

  return (
    <div className="relative group flex flex-col w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 pr-12 resize-y ${className}`}
      />
      
      {hasSupport && (
        <button
          type="button"
          onClick={toggleListening}
          className="absolute right-2 top-2 p-2 rounded-full transition-all duration-200"
          aria-label={isListening ? "Stop listening" : "Start speaking"}
        >
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-red-100 text-red-600 p-1.5 rounded-full"
            >
              <Mic className="w-4 h-4" />
            </motion.div>
          ) : (
            <div className="bg-slate-100 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-full">
              <Mic className="w-4 h-4" />
            </div>
          )}
        </button>
      )}

      {errorStatus && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
          <AlertCircle className="w-3 h-3" />
          {errorStatus}
        </p>
      )}
      
      {isListening && (
        <p className="text-xs text-emerald-600 animate-pulse mt-1 font-medium">
          Listening... Speak clearly.
        </p>
      )}
    </div>
  );
}
