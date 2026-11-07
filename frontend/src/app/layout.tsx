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
  title: "VoiceBridge | Clinical Speech Reconstruction Engine",
  description:
    "Real-time assistive speech reconstruction companion for dysarthric speech (Cerebral Palsy, Stroke, ALS). THREWS Odyssey 2026.",
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
