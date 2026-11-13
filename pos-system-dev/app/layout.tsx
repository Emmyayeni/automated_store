import type React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import SessionWrapper from "./sessionWrapper";

export const metadata: Metadata = {
  title: "StockFlow | Automated Inventory Control System for Multi-Branch Supermarket",
  description: "A centralized, automated inventory control system for multi-branch retail and supermarket operations featuring real-time stock balances, inter-branch transfers, reorder level alerts, and transaction ledgers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StockFlow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="HardyPOS" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HardyPOS" />
        <meta name="description" content="Complete point of sale system for retail and pharmacy businesses" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />
        
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3b82f6" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://hardypos.com" />
        <meta name="twitter:title" content="HardyPOS" />
        <meta name="twitter:description" content="Complete point of sale system for retail and pharmacy businesses" />
        <meta name="twitter:image" content="https://hardypos.com/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@hardypos" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="HardyPOS" />
        <meta property="og:description" content="Complete point of sale system for retail and pharmacy businesses" />
        <meta property="og:site_name" content="HardyPOS" />
        <meta property="og:url" content="https://hardypos.com" />
        <meta property="og:image" content="https://hardypos.com/icons/icon-192x192.png" />
        
        {/* Disable zoom on mobile for better UX */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body>
        <SessionWrapper>
          { children}
        </SessionWrapper>
        <Toaster />
      </body>
    </html>
  );
}