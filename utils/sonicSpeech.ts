import { SonicLanguage, SONIC_LANGUAGES } from './sonicLanguages';
import { useEntityStore } from '@/stores/useEntityStore';

type EmotionTag = 'excited' | 'thinking' | 'alert' | 'greeting';
type Mood = 'normal' | 'happy' | 'worried' | 'urgent';
type State = 'idle' | 'alerting' | 'excited' | 'investigating' | 'greeting';

interface VoiceConfig {
  rate: number;
  pitch: number;
  volume: number;
}

const EMOTION_MAP: Record<EmotionTag, { mood: Mood; state: State }> = {
  alert: { mood: 'urgent', state: 'alerting' },
  excited: { mood: 'happy', state: 'excited' },
  thinking: { mood: 'normal', state: 'investigating' },
  greeting: { mood: 'normal', state: 'greeting' },
};

const VOICE_CONFIGS: Record<Mood, Record<'en' | 'other', VoiceConfig>> = {
  urgent: {
    en: { rate: 0.95, pitch: 1.05, volume: 1.0 },
    other: { rate: 0.80, pitch: 1.02, volume: 1.0 },
  },
  happy: {
    en: { rate: 0.92, pitch: 1.0, volume: 0.95 },
    other: { rate: 0.78, pitch: 0.98, volume: 0.95 },
  },
  worried: {
    en: { rate: 0.82, pitch: 0.95, volume: 0.92 },
    other: { rate: 0.72, pitch: 0.93, volume: 0.92 },
  },
  normal: {
    en: { rate: 0.88, pitch: 0.98, volume: 0.95 },
    other: { rate: 0.75, pitch: 0.96, volume: 0.95 },
  },
};

const NEURAL_VOICE_KEYWORDS = ['Neural', 'Premium', 'Enhanced', 'Natural', 'HD'];

const parseEmotion = (text: string): { mood: Mood; state: State; cleanText: string } => {
  const emotionMatch = text.match(/\[(?:excited|thinking|alert|greeting)\]/i);
  
  if (emotionMatch) {
    const tag = emotionMatch[0].slice(1, -1).toLowerCase() as EmotionTag;
    const { mood, state } = EMOTION_MAP[tag];
    const cleanText = text.replace(/\[.*?\]/g, '').trim();
    return { mood, state, cleanText };
  }
  
  return { mood: 'normal', state: 'idle', cleanText: text };
};

const cleanText = (text: string): string => {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/•/g, ',')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/[—–]/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .trim();
};

const selectBestVoice = (voices: SpeechSynthesisVoice[], lang: SonicLanguage, langConfig: any): SpeechSynthesisVoice | null => {
  const langPrefix = langConfig.voiceLang.split('-')[0];

  const voice =
    voices.find(v => v.name === langConfig.voiceName) ||
    voices.find(v => v.lang === langConfig.voiceLang && NEURAL_VOICE_KEYWORDS.some(kw => v.name.includes(kw))) ||
    voices.find(v => v.lang === langConfig.voiceLang && v.localService) ||
    voices.find(v => v.lang === langConfig.voiceLang) ||
    voices.find(v => v.lang.startsWith(langPrefix) && NEURAL_VOICE_KEYWORDS.some(kw => v.name.includes(kw))) ||
    voices.find(v => v.lang.startsWith(langPrefix) && v.localService) ||
    voices.find(v => v.lang.startsWith(langPrefix)) ||
    voices.find(v => v.lang.startsWith('en-IN')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null;

  if (voice) {
    console.log(`🎤 Voice: "${voice.name}" [${voice.lang}] for ${lang}`);
  }
  return voice;
};

const applyVoiceConfig = (utterance: SpeechSynthesisUtterance, mood: Mood, lang: SonicLanguage): void => {
  const configKey = lang === 'en' ? 'en' : 'other';
  const config = VOICE_CONFIGS[mood][configKey];
  
  utterance.rate = config.rate;
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;
};

// ── Spatial Audio Engine ─────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let pannerNode: StereoPannerNode | null = null;
let gainNode: GainNode | null = null;

function getAudioContext(): { ctx: AudioContext; panner: StereoPannerNode; gain: GainNode } | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
      pannerNode = audioCtx.createStereoPanner();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // silent — we only use it to drive the panner context
      pannerNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }
    return { ctx: audioCtx, panner: pannerNode!, gain: gainNode! };
  } catch {
    return null;
  }
}

/**
 * Update spatial pan based on avatar X position (0 → screen width).
 * Call this whenever the avatar moves.
 */
export const updateSpatialPan = (avatarX: number): void => {
  const audio = getAudioContext();
  if (!audio) return;
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  const pan = Math.max(-1, Math.min(1, (avatarX / window.innerWidth) * 2 - 1));
  audio.panner.pan.setTargetAtTime(pan, audio.ctx.currentTime, 0.05);
};

let voicesLoaded = false;
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true;
  };
}

export const speakSonic = (text: string, lang: SonicLanguage = 'en', avatarX?: number): void => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const { mood, state, cleanText: parsedText } = parseEmotion(text);
    const finalText = cleanText(parsedText);
    if (!finalText) return;

    const store = useEntityStore.getState();
    store.setState(state);

    // Apply spatial pan before speaking
    if (avatarX !== undefined) updateSpatialPan(avatarX);

    const speak = () => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(finalText);
      const langConfig = SONIC_LANGUAGES[lang];
      utterance.lang = langConfig.voiceLang;
      applyVoiceConfig(utterance, mood, lang);

      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = selectBestVoice(voices, lang, langConfig);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => store.setState('idle');
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') store.setState('idle');
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      const checkVoices = setInterval(() => {
        if (window.speechSynthesis.getVoices().length > 0) {
          clearInterval(checkVoices);
          speak();
        }
      }, 100);
      setTimeout(() => clearInterval(checkVoices), 2000);
    } else {
      speak();
    }
  } catch (e) {
    console.warn('🔇 Speech synthesis unavailable:', e);
  }
};
