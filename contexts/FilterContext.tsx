'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

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
}

interface FilterContextValue {
  filter: FilterState;
  setCoordinator: (coordinator: string | null) => void;
  setStatus: (status: FilterStatus) => void;
  setDistrict: (district: string | null) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

const INITIAL_FILTER_STATE: FilterState = {
  coordinator: null,
  status: 'All',
  district: null,
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER_STATE);

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

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilter(INITIAL_FILTER_STATE);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = filter.coordinator !== null || 
                           filter.status !== 'All' || 
                           filter.district !== null;

  // Debug logging
  useEffect(() => {
    console.log('🎯 Filter State Updated:', filter);
  }, [filter]);

  return (
    <FilterContext.Provider
      value={{
        filter,
        setCoordinator,
        setStatus,
        setDistrict,
        resetFilters,
        hasActiveFilters,
      }}
    >
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
