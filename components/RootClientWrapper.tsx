'use client';

import { ReactNode } from 'react';
import { FilterProvider } from '@/contexts/FilterContext';
import { TreeFilterProvider } from '@/contexts/TreeFilterContext';
import { Toaster } from 'sonner';

export function RootClientWrapper({ children }: { children: ReactNode }) {
  return (
    <FilterProvider>
      <TreeFilterProvider>
        {children}
        <Toaster theme="light" position="bottom-right" />
      </TreeFilterProvider>
    </FilterProvider>
  );
}


