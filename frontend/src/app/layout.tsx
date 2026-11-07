/**
 * VoiceBridge Root Layout Shell
 * =============================
 * Configures global typography, viewport metadata, and high-contrast WCAG styling.
 * Uses local Geist Variable fonts to eliminate external Google Fonts network dependencies,
 * ensuring zero-latency rendering and offline demo capability.
 */

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "VoiceBridge | Assistive Speech Transcription",
  description:
    "Real-time assistive speech transcription for dysarthric speech (Cerebral Palsy, TBI, ALS). SIES GST • THREWS Odyssey 2026.",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-canvas text-clinical-text antialiased selection:bg-clinical-teal selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
