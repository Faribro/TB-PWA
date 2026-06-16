import { useEffect, useCallback } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';
import type { Map as MapLibreMap } from 'maplibre-gl';

export function useMapProjection() {
  const targetPosition = useEntityStore(s => s.targetPosition);
  const setPosition = useEntityStore(s => s.setPosition);
  const mapInstance = useEntityStore(s => s.mapInstance);
  const setMode = useEntityStore(s => s.setMode);
  const isFlying = useEntityStore(s => s.isFlying);
  
  const projectToScreen = useCallback((map: MapLibreMap, lat: number, lng: number) => {
    // Convert lat/lng to screen pixels
    const point = map.project([lng, lat]);
    
    // Get map container position in viewport
    const rect = map.getContainer().getBoundingClientRect();
    
    // Calculate absolute screen position
    const x = rect.left + point.x;
    const y = rect.top + point.y;
    
    return { x, y };
  }, []);
  
  useEffect(() => {
    if (!mapInstance || !targetPosition?.lat || !targetPosition?.lng) return;
    
    const map = mapInstance as MapLibreMap;
    
    const updatePosition = () => {
      if (!targetPosition.lat || !targetPosition.lng) return;
      
      const screenPos = projectToScreen(map, targetPosition.lat, targetPosition.lng);
      setPosition({ ...screenPos, lat: targetPosition.lat, lng: targetPosition.lng });
    };
    
    // Initial position
    updatePosition();
    
    // Update on map move/zoom
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('rotate', updatePosition);
    map.on('pitch', updatePosition);
    
    // Grow back to micro after landing
    if (isFlying) {
      setTimeout(() => {
        setMode('micro');
      }, 1000);
    }
    
    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('rotate', updatePosition);
      map.off('pitch', updatePosition);
    };
  }, [mapInstance, targetPosition, projectToScreen, setPosition, setMode, isFlying]);
  
  return { projectToScreen };
}
