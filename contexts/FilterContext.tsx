'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { useEntityStore } from '@/stores/useEntityStore';

/**
 * HHXR Engine - Universal Filter Context
 * Single Source of Truth for all filtering operations
 * 
 * This context replaces:
 * - selectedCoordinator (SpatialIntelligenceMap)
 * - selectedStatus (SpatialIntelligenceMap)
 * - TreeFilterContext.district
 */

export type FilterStatus = 'All' | 'High Alert' | 'On Track';

export interface FilterState {
  coordinator: string | null;
  status: FilterStatus;
  district: string | null;
  state: string | null;
}

interface FilterContextValue {
  filter: FilterState;
  setCoordinator: (coordinator: string | null) => void;
  setStatus: (status: FilterStatus) => void;
  setDistrict: (district: string | null) => void;
  setState: (state: string | null) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

const INITIAL_FILTER_STATE: FilterState = {
  coordinator: null,
  status: 'All',
  district: null,
  state: null,
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER_STATE);
  const activeFilters = useEntityStore(s => s.activeFilters);

  // Sync with global store (for Sonic triggers)
  useEffect(() => {
    if (activeFilters) {
      setFilter(prev => ({
        ...prev,
        state: activeFilters.state,
        district: activeFilters.district,
        coordinator: activeFilters.coordinator,
        status: activeFilters.status || 'All'
      }));
    }
  }, [activeFilters]);


  // Coordinator filter
  const setCoordinator = useCallback((coordinator: string | null) => {
    setFilter(prev => ({ ...prev, coordinator }));
  }, []);

  // Status filter
  const setStatus = useCallback((status: FilterStatus) => {
    setFilter(prev => ({ ...prev, status }));
  }, []);

  // District filter
  const setDistrict = useCallback((district: string | null) => {
    setFilter(prev => ({ ...prev, district }));
  }, []);

  // State filter
  const setState = useCallback((state: string | null) => {
    setFilter(prev => ({ ...prev, state }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilter(INITIAL_FILTER_STATE);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = filter.coordinator !== null || 
                           filter.status !== 'All' || 
                           filter.district !== null ||
                           filter.state !== null;

  const contextValue = useMemo(() => ({
    filter,
    setCoordinator,
    setStatus,
    setDistrict,
    setState,
    resetFilters,
    hasActiveFilters,
  }), [
    filter,
    setCoordinator,
    setStatus,
    setDistrict,
    setState,
    resetFilters,
    hasActiveFilters
  ]);

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

export function useUniversalFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useUniversalFilter must be used within FilterProvider');
  }
  return context;
}
