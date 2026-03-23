import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Outfit, Share_Tech_Mono, Syncopate } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const outfit = Outfit({ subsets: ["latin"], weight: ['400', '700'], variable: '--font-outfit' });
const shareTechMono = Share_Tech_Mono({ subsets: ["latin"], weight: ['400'], variable: '--font-share-tech-mono' });
const syncopate = Syncopate({ subsets: ["latin"], weight: ['700'], variable: '--font-syncopate' });


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
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          outfit.variable, 
          shareTechMono.variable, 
          syncopate.variable, 
          outfit.className
        )} 
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

