import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { SWRProvider } from "@/components/SWRProvider";
import { TreeFilterProvider } from "@/contexts/TreeFilterContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TB Command Center | Alliance India",
  description: "Enterprise TB surveillance platform for correctional facilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SWRProvider>
          <QueryProvider>
            <AuthProvider>
              <TreeFilterProvider>
                {children}
                <Toaster theme="light" position="bottom-right" />
              </TreeFilterProvider>
            </AuthProvider>
          </QueryProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
