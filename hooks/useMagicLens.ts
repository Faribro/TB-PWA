import { useState, useEffect, useRef, useCallback } from 'react';

interface MagicLensState {
  isLensActive: boolean;
  mouseX: number;
  mouseY: number;
  hoveredDistrict: any | null;
}

export const useMagicLens = () => {
  // State for lens activation (only updates on Alt key press/release)
  const [isLensActive, setIsLensActive] = useState(false);
  
  // State for hovered district (only updates when district changes, not on every mouse move)
  const [hoveredDistrict, setHoveredDistrict] = useState<any | null>(null);
  
  // Refs for high-frequency updates (mouse position) - NO re-renders
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const hoveredDistrictRef = useRef<any | null>(null);
  
  // Ref to track the last district ID to prevent unnecessary state updates
  const lastDistrictIdRef = useRef<string | null>(null);

  // Handle Alt key press/release
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt key specifically
      if (e.key === 'Alt' && !isLensActive) {
        e.preventDefault();
        console.log('🔍 Magic Lens ACTIVATED');
        
        
        setIsLensActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Check for Alt key specifically
      if (e.key === 'Alt' && isLensActive) {
        e.preventDefault();
        console.log('🔍 Magic Lens DEACTIVATED');
        setIsLensActive(false);
        setHoveredDistrict(null);
        hoveredDistrictRef.current = null;
        lastDistrictIdRef.current = null;
      }
    };

    // Listen for Sonic's toggle command
    const handleSonicToggle = () => {
      setIsLensActive(prev => {
        const newState = !prev;
        console.log('🔍 Sonic toggled Magic Lens:', newState);
        
        if (newState) {
        }
        
        if (prev) {
          setHoveredDistrict(null);
          hoveredDistrictRef.current = null;
          lastDistrictIdRef.current = null;
        }
        return newState;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('toggle-magic-lens', handleSonicToggle);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('toggle-magic-lens', handleSonicToggle);
    };
  }, [isLensActive]);

  // Update mouse position (ref only - no re-render)
  const updateMousePosition = useCallback((x: number, y: number) => {
    mouseXRef.current = x;
    mouseYRef.current = y;
  }, []);

  // Update hovered district (only triggers state update if district changes)
  const updateHoveredDistrict = useCallback((district: any | null) => {
    hoveredDistrictRef.current = district;
    
    // Extract unique identifier from district
    const currentDistrictId = district?.properties?.district || district?.district || null;
    
    // Only update state if the district actually changed
    if (currentDistrictId !== lastDistrictIdRef.current) {
      lastDistrictIdRef.current = currentDistrictId;
      setHoveredDistrict(district);
    }
  }, []);

  // Get current mouse position (for components that need it)
  const getMousePosition = useCallback(() => ({
    x: mouseXRef.current,
    y: mouseYRef.current,
  }), []);

  // Manual toggle for testing
  const toggleLens = useCallback(() => {
    setIsLensActive(prev => {
      console.log('🔍 Manual toggle:', !prev);
      return !prev;
    });
  }, []);

  return {
    isLensActive,
    hoveredDistrict,
    mouseXRef,
    mouseYRef,
    updateMousePosition,
    updateHoveredDistrict,
    getMousePosition,
    toggleLens,
  };
};
