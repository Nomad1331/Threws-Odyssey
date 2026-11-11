/**
 * VoiceBridge Root Layout Shell
 * =============================
 * Configures global typography, viewport metadata, and high-contrast styling.
 * Uses local Geist Variable fonts, so rendering makes no external font requests.
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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://voicebridge-threws.vercel.app";
const TITLE = "VoiceBridge | Assistive Speech Transcription";
const DESCRIPTION =
  "Assistive speech transcription for dysarthric speech (Cerebral Palsy, TBI, ALS). SIES GST - THREWS Odyssey 2026.";
const SOCIAL_IMAGE = "/og-preview.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "VoiceBridge",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "VoiceBridge assistive speech transcription interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-canvas text-clinical-text antialiased selection:bg-clinical-teal selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
