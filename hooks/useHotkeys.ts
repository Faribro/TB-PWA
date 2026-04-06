import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface HotkeyMap {
  [keyCombo: string]: KeyHandler;
}

/**
 * useHotkeys - Global keyboard shortcut listener
 * Example: 'meta+k' (Command+K or Ctrl+K), 'escape'
 */
export function useHotkeys(hotkeys: HotkeyMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is intensely typing inside an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // We allow escape to bubble anywhere.
      // Other keys we might want to block if inside input (except meta keys)
      if (isInput && e.key !== 'Escape' && !e.metaKey && !e.ctrlKey) {
        return;
      }

      for (const [keyCombo, handler] of Object.entries(hotkeys)) {
        const keys = keyCombo.toLowerCase().split('+');
        const wantsMeta = keys.includes('meta') || keys.includes('ctrl');
        const wantsShift = keys.includes('shift');
        const wantsAlt = keys.includes('alt');
        
        const targetKey = keys[keys.length - 1]; // e.g. "k" or "escape"

        const metaMatch = wantsMeta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = wantsShift ? e.shiftKey : !e.shiftKey;
        const altMatch = wantsAlt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === targetKey;

        if (metaMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          handler(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys]);
}
