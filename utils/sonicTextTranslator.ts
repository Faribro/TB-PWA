import { toast } from 'sonner';
import { SonicLanguage } from './sonicLanguages';

const activeTranslations = new Map<string, Promise<string>>();

function makeCacheKey(lang: SonicLanguage, text: string): string {
  // Hash: lang + length + first 50 chars — all ASCII-safe
  const snippet = text.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, '');
  return `sonic_v2_${lang}_${text.length}_${snippet.replace(/\s+/g, '_')}`;
}

export const clearTranslationCache = (): void => {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sonic_'));
  keys.forEach(k => localStorage.removeItem(k));
};

export const translateSonicText = async (text: string, lang: SonicLanguage): Promise<string> => {
  if (lang === 'en' || !text) return text;

  const cacheKey = makeCacheKey(lang, text);

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached && cached !== text) return cached;
  }

  if (activeTranslations.has(cacheKey)) {
    return activeTranslations.get(cacheKey) as Promise<string>;
  }

  const fetchPromise = fetch('/api/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, text }),
    signal: AbortSignal.timeout(8000),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated: string = data.translated || text;

      if (typeof window !== 'undefined' && translated !== text) {
        try {
          localStorage.setItem(cacheKey, translated);
        } catch (e) {
          console.warn('localStorage quota exceeded, clearing old translations');
          const keys = Object.keys(localStorage).filter(k => k.startsWith('sonic_v2_'));
          keys.slice(0, Math.floor(keys.length / 2)).forEach(k => localStorage.removeItem(k));
        }
      }
      activeTranslations.delete(cacheKey);
      return translated;
    })
    .catch((err) => {
      console.error('Translation error:', err);
      activeTranslations.delete(cacheKey);
      return text;
    });

  activeTranslations.set(cacheKey, fetchPromise);
  return fetchPromise;
};
