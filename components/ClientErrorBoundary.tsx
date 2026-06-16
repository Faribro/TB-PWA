'use client';

import ErrorBoundaryClass from './ErrorBoundary';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function ClientErrorBoundary({ children }: Props) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}
