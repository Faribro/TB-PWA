'use client';

import { useEffect } from 'react';
import { useSessionScope } from '@/hooks/useSessionScope';
import { useEntityStore } from '@/stores/useEntityStore';

export function ScopeInitializer(): null {
  const scope = useSessionScope();
  const initializeScope = useEntityStore(s => s.initializeScope);

  useEffect(() => {
    if (scope) initializeScope(scope);
  }, [scope?.role, scope?.state, scope?.district, initializeScope]);

  return null;
}
