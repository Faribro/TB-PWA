'use client';

import React, { useEffect, useState } from 'react';
import { Languages, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const FONT_SIZES = [
  { label: '100%', value: 100 },
  { label: '125%', value: 125 },
  { label: '150%', value: 150 },
  { label: '175%', value: 175 },
  { label: '200%', value: 200 },
];

export function GovAccessibilityToolbar() {
  const [fontScale, setFontScale] = useState<number>(100);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [locale, setLocale] = useState<'en' | 'hi'>('en');

  // Hydrate preferences from localStorage
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem('samadhaan_font_scale');
      if (savedScale) {
        const scale = parseInt(savedScale, 10);
        setFontScale(scale);
        document.documentElement.style.fontSize = `${scale}%`;
      }

      const savedContrast = localStorage.getItem('samadhaan_high_contrast');
      if (savedContrast === 'true') {
        setIsHighContrast(true);
        document.documentElement.setAttribute('data-contrast', 'high');
      }

      const savedLocale = localStorage.getItem('samadhaan_locale');
      if (savedLocale === 'hi' || savedLocale === 'en') {
        setLocale(savedLocale);
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, []);

  const adjustFont = (delta: number) => {
    const currentIndex = FONT_SIZES.findIndex(f => f.value === fontScale);
    let newIndex = currentIndex + delta;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= FONT_SIZES.length) newIndex = FONT_SIZES.length - 1;

    const newScale = FONT_SIZES[newIndex].value;
    setFontScale(newScale);
    document.documentElement.style.fontSize = `${newScale}%`;
    localStorage.setItem('samadhaan_font_scale', String(newScale));
  };

  const resetFont = () => {
    setFontScale(100);
    document.documentElement.style.fontSize = '100%';
    localStorage.setItem('samadhaan_font_scale', '100');
  };

  const toggleContrast = () => {
    const nextState = !isHighContrast;
    setIsHighContrast(nextState);
    if (nextState) {
      document.documentElement.setAttribute('data-contrast', 'high');
      localStorage.setItem('samadhaan_high_contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-contrast');
      localStorage.setItem('samadhaan_high_contrast', 'false');
    }
  };

  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'hi' : 'en';
    setLocale(nextLocale);
    localStorage.setItem('samadhaan_locale', nextLocale);
    window.dispatchEvent(new CustomEvent('samadhaan-locale-change', { detail: nextLocale }));
  };

  return (
    <nav
      aria-label="Accessibility & Language Navigation"
      className="bg-slate-900 text-slate-100 text-xs py-1.5 px-4 border-b border-slate-800 flex items-center justify-between z-50 sticky top-0"
    >
      {/* Skip to Main Content Link (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-amber-400 focus:text-slate-900 font-semibold rounded-md"
      >
        {locale === 'hi' ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'}
      </a>

      {/* Official Government of India / Alliance Indicator */}
      <div className="flex items-center space-x-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-medium text-slate-300 tracking-wide uppercase">
          {locale === 'hi' ? 'भारत सरकार | राष्ट्रीय टीबी उन्मूलन कार्यक्रम' : 'Govt of India • NTEP Surveillance'}
        </span>
      </div>

      {/* Accessibility Controls */}
      <div className="flex items-center space-x-3">
        {/* Font Resizer */}
        <div className="flex items-center bg-slate-800 rounded px-1.5 py-0.5 border border-slate-700 space-x-1" role="group" aria-label="Text Size Controls">
          <button
            type="button"
            onClick={() => adjustFont(-1)}
            title="Decrease font size (A-)"
            aria-label="Decrease text size"
            className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white font-bold transition-colors"
          >
            A-
          </button>
          <button
            type="button"
            onClick={resetFont}
            title="Reset font size (A)"
            aria-label="Standard text size"
            className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white font-semibold transition-colors"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => adjustFont(1)}
            title="Increase font size (A+)"
            aria-label="Increase text size"
            className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white font-bold transition-colors"
          >
            A+
          </button>
          <span className="text-[10px] text-slate-400 pl-1 border-l border-slate-700">{fontScale}%</span>
        </div>

        {/* High Contrast Toggle */}
        <button
          type="button"
          onClick={toggleContrast}
          aria-pressed={isHighContrast}
          className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
            isHighContrast
              ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
          }`}
          title="Toggle High Contrast Mode"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isHighContrast ? 'Contrast: High' : 'Standard'}</span>
        </button>

        {/* Bilingual Switcher */}
        <button
          type="button"
          onClick={toggleLocale}
          className="flex items-center space-x-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded border border-blue-700/50 transition-colors font-medium"
          title="Switch Language (English / हिन्दी)"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{locale === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>
      </div>
    </nav>
  );
}
export default GovAccessibilityToolbar;
