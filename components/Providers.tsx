"use client";

import { ReactNode } from "react";
import { SWRProvider } from "./SWRProvider";
import { QueryProvider } from "./QueryProvider";
import AuthProvider from "./AuthProvider";
import { RootClientWrapper } from "./RootClientWrapper";
import SimpleErrorBoundary from "./SimpleErrorBoundary";
import { AuthErrorBoundary } from "./AuthErrorBoundary";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <SimpleErrorBoundary key="root-error-boundary">
        <SWRProvider>
          <QueryProvider>
            <AuthErrorBoundary>
              <AuthProvider>
                <RootClientWrapper>
                  {children}
                </RootClientWrapper>
              </AuthProvider>
            </AuthErrorBoundary>
          </QueryProvider>
        </SWRProvider>
      </SimpleErrorBoundary>
    </>
  );
}



