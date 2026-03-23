import { SonicLanguage } from './sonicLanguages';
import { PAGE_GUIDES_EN, PageGuide } from './sonicPageGuides';

const CACHE_KEY = (path: string, lang: string) =>
  `sonic_guide_${lang}_${path.replace(/\//g, '_')}`;

export const getTranslatedGuide = async (
  path: string,
  lang: SonicLanguage
): Promise<PageGuide | null> => {
  const englishGuide = PAGE_GUIDES_EN[path];
  if (!englishGuide) return null;

  // Return English directly — no API call needed
  if (lang === 'en') return englishGuide;

  // Check localStorage cache first
  const cacheKey = CACHE_KEY(path, lang);
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // corrupted cache — continue to translate
      }
    }
  }

  // Translate via server-side API route
  try {
    const res = await fetch('/api/ai/translate-guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, guide: englishGuide }),
    });

    if (!res.ok) {
      console.warn('Guide translation API returned', res.status);
      return englishGuide;
    }

    const translated: PageGuide = await res.json();

    // Cache it — never translate same page+lang twice
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(translated));
    }

    return translated;
  } catch (e) {
    console.warn('Sonic guide translation failed, falling back to English', e);
    return englishGuide;
  }
};

// Pre-warm cache for all pages in background after login
export const prewarmGuideCache = (lang: SonicLanguage) => {
  if (lang === 'en') return;

  const paths = Object.keys(PAGE_GUIDES_EN);
  paths.forEach((path, index) => {
    const cacheKey = CACHE_KEY(path, lang);
    if (typeof window !== 'undefined' && !localStorage.getItem(cacheKey)) {
      // Stagger requests 2s apart to avoid rate limiting
      setTimeout(() => getTranslatedGuide(path, lang), index * 2000);
    }
  });
};
