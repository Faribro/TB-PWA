'use client';

import { useEffect } from 'react';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useEntityStore } from '@/stores/useEntityStore';

export function ScopeInitializer(): null {
  const scope = useSessionScope();
  const initializeScope = useEntityStore(s => s.initializeScope);

  useEffect(() => {
    if (scope) {
      console.log('[ScopeInitializer] 🔍 Initializing user scope:');
      console.log('[ScopeInitializer]   Role:', scope.role);
      console.log('[ScopeInitializer]   State:', scope.state);
      console.log('[ScopeInitializer]   District:', scope.district);
      console.log('[ScopeInitializer]   Staff Name:', scope.staffName);
      initializeScope(scope);
    }
  }, [scope?.role, scope?.state, scope?.district, scope?.staffName, initializeScope]);

  return null;
}
