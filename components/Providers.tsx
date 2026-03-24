"use client";

import { ReactNode } from "react";
import { SWRProvider } from "./SWRProvider";
import { QueryProvider } from "./QueryProvider";
import AuthProvider from "./AuthProvider";
import { RootClientWrapper } from "./RootClientWrapper";
import SimpleErrorBoundary from "./SimpleErrorBoundary";
import ClientFloatingEntity from "./ClientFloatingEntity";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <ClientFloatingEntity />
      <SimpleErrorBoundary key="root-error-boundary">
        <SWRProvider>
          <QueryProvider>
            <AuthProvider>
              <RootClientWrapper>
                {children}
              </RootClientWrapper>
            </AuthProvider>
          </QueryProvider>
        </SWRProvider>
      </SimpleErrorBoundary>
    </>
  );
}



