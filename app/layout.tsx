import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Outfit, Share_Tech_Mono, Syncopate } from "next/font/google";
import "./globals.css";
import "../styles/premium-buttons.css";
import { Providers } from "@/components/Providers";
import { DataPacketChase } from "@/components/DataPacketChase";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { AudioContextInitializer } from "@/components/AudioContextInitializer";
import { ScopeInitializer } from "@/components/ScopeInitializer";
import TourProvider from "@/components/TourProvider";
import { Analytics } from "@vercel/analytics/next";

const outfit = Outfit({ subsets: ["latin"], weight: ['400', '700'], variable: '--font-outfit' });
const shareTechMono = Share_Tech_Mono({ subsets: ["latin"], weight: ['400'], variable: '--font-share-tech-mono' });
const syncopate = Syncopate({ subsets: ["latin"], weight: ['700'], variable: '--font-syncopate' });


export const metadata: Metadata = {
  title: "SAMADHAAN | Health OS",
  description: "National Integrated Prison & OCS TB Surveillance System",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/Images/Logo/AllianceIndia-Logo.png', sizes: 'any' },
      { url: '/Images/Logo/AllianceIndia-Logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/Images/Logo/AllianceIndia-Logo.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/Images/Logo/AllianceIndia-Logo.png',
    apple: '/Images/Logo/AllianceIndia-Logo.png',
  },
  robots: {
    index: false,
    follow: false,
  },
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
          outfit.className,
          "bg-slate-50 text-slate-900"
        )} 
        suppressHydrationWarning
      >
        <Providers>
          <ScopeInitializer />
          <ServiceWorkerRegistration />
          <AudioContextInitializer />
          <DataPacketChase />
          <TourProvider>
            {children}
          </TourProvider>
          <Analytics />
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="goo-filter">
            <defs>
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo" />
                <feBlend in2="goo" in="SourceGraphic" result="mix" />
              </filter>
            </defs>
          </svg>
        </Providers>
      </body>
    </html>
  );
}

