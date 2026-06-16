import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';

interface UseVapiOptions {
  onMessageUpdate?: (message: string, isFinal: boolean) => void;
  onStateChange?: (state: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  onError?: (error: string) => void;
}

export function useVapi({ onMessageUpdate, onStateChange, onError }: UseVapiOptions = {}) {
  const vapiRef = useRef<Vapi | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      console.error('VAPI public key not found');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    // Speech start/end events
    vapi.on('speech-start', () => {
      setIsSpeaking(true);
      onStateChange?.('speaking');
    });

    vapi.on('speech-end', () => {
      setIsSpeaking(false);
      onStateChange?.('idle');
    });

    // Message events for real-time transcript
    vapi.on('message', (message: any) => {
      if (message.type === 'transcript' && message.transcriptType === 'partial') {
        onMessageUpdate?.(message.transcript, false);
      } else if (message.type === 'transcript' && message.transcriptType === 'final') {
        onMessageUpdate?.(message.transcript, true);
      }
    });

    // Call state events
    vapi.on('call-start', () => {
      setIsActive(true);
      onStateChange?.('listening');
    });

    vapi.on('call-end', () => {
      setIsActive(false);
      setIsSpeaking(false);
      onStateChange?.('idle');
    });

    vapi.on('error', (error: any) => {
      console.error('VAPI error:', error);
      onError?.(error.message || 'Voice AI error');
    });

    return () => {
      vapi.stop();
    };
  }, [onMessageUpdate, onStateChange, onError]);

  const start = async (assistantOverrides?: any) => {
    if (!vapiRef.current) {
      onError?.('VAPI not initialized');
      return;
    }

    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    
    if (assistantId) {
      try {
        await vapiRef.current.start({
          assistantId,
          assistantOverrides,
        } as any);
      } catch (error: any) {
        console.error('Failed to start VAPI with assistant:', error);
        onError?.(error?.message || error?.error || 'Failed to start voice conversation');
      }
      return;
    }

    // Fallback: inline configuration
    try {
      await vapiRef.current.start({
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en-IN',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are TB Genie, a warm AI analyst for India's TB programme. Address the user as "Sir". Keep responses under 3 sentences. You have access to real-time district data.`
            }
          ],
          temperature: 0.7,
        },
        voice: {
          provider: '11labs',
          voiceId: 'adam',
        },
        ...assistantOverrides,
      });
    } catch (error: any) {
      console.error('Failed to start VAPI inline:', error);
      onError?.(error?.message || error?.error || 'Failed to start voice conversation');
    }
  };

  const stop = () => {
    vapiRef.current?.stop();
  };

  const send = (message: string) => {
    vapiRef.current?.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: message,
      },
    });
  };

  return {
    start,
    stop,
    send,
    isActive,
    isSpeaking,
  };
}
