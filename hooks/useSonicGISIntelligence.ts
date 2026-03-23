import { useEffect } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

export function useSonicGISIntelligence(isOnGIS: boolean) {
  const pushSonicAlert = useEntityStore(s => s.pushSonicAlert);

  useEffect(() => {
    if (!isOnGIS) return;

    // Proactive GIS insights on map load
    const timer = setTimeout(() => {
      pushSonicAlert('🗺️ GIS Map loaded - analyzing spatial patterns...');
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOnGIS, pushSonicAlert]);

  return { isOnGIS };
}
