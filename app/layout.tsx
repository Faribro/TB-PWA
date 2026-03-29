import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Outfit, Share_Tech_Mono, Syncopate } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { DataPacketChase } from "@/components/DataPacketChase";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const outfit = Outfit({ subsets: ["latin"], weight: ['400', '700'], variable: '--font-outfit' });
const shareTechMono = Share_Tech_Mono({ subsets: ["latin"], weight: ['400'], variable: '--font-share-tech-mono' });
const syncopate = Syncopate({ subsets: ["latin"], weight: ['700'], variable: '--font-syncopate' });


export const metadata: Metadata = {
  title: "SAMADHAAN | Health OS",
  description: "National Integrated Prison & OCS TB Surveillance System",
  icons: {
    icon: '/Images/Logo/AllianceIndia-Logo.png',
    shortcut: '/Images/Logo/AllianceIndia-Logo.png',
    apple: '/Images/Logo/AllianceIndia-Logo.png',
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
          <ServiceWorkerRegistration />
          <DataPacketChase />
          {children}
        </Providers>
      </body>
    </html>
  );
}

