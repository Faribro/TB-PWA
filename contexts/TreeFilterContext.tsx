'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface TreeFilter {
  year?: number;
  month?: number;
  district?: string;
  date?: string;
  actionType?: 'sputum' | 'diagnosis' | 'treatment' | 'admin';
}

interface TreeFilterContextType {
  filter: TreeFilter;
  setFilter: (filter: TreeFilter) => void;
  clearFilter: () => void;
}

const TreeFilterContext = createContext<TreeFilterContextType | undefined>(undefined);

export function TreeFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<TreeFilter>({});

  const clearFilter = () => setFilter({});

  return (
    <TreeFilterContext.Provider value={{ filter, setFilter, clearFilter }}>
      {children}
    </TreeFilterContext.Provider>
  );
}

export function useTreeFilter() {
  const context = useContext(TreeFilterContext);
  if (!context) throw new Error('useTreeFilter must be used within TreeFilterProvider');
  return context;
}
