import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';

export const useOmniBar = () => {
  const toggleOmniBar = useUIStore((state) => state.toggleOmniBar);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOmniBar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOmniBar]);
};
