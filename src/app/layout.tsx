import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// TEMPORARILY DISABLED FOR DEBUG
// import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
// import { AuthProvider } from "@/lib/auth/simple-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/monitoring/ErrorBoundary";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "7P Eğitim Platformu - Öğren, Geliş, Başar",
  description: "İnteraktif kurslar, quizler ve kişiselleştirilmiş öğrenme deneyimleri sunan kapsamlı online eğitim platformu.",
  keywords: "eğitim, online öğrenme, kurslar, quizler, e-öğrenme, 7P Eğitim",
  authors: [{ name: "7P Eğitim Ekibi" }],
  openGraph: {
    title: "7P Eğitim Platformu",
    description: "İnteraktif kurslar, quizler ve kişiselleştirilmiş öğrenme deneyimleri sunan kapsamlı online eğitim platformu.",
    type: "website",
    siteName: "7P Eğitim",
  },
  twitter: {
    card: "summary_large_image",
    title: "7P Eğitim Platformu",
    description: "İnteraktif kurslar, quizler ve kişiselleştirilmiş öğrenme deneyimleri sunan kapsamlı online eğitim platformu.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary level="critical" context="Application Root">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              {/* TEMPORARILY DISABLED FOR DEBUG */}
              {/* <AuthProvider> */}
              {/* <AuthErrorBoundary> */}
                {children}
              {/* </AuthErrorBoundary> */}
              {/* </AuthProvider> */}
          </ThemeProvider>
        </ErrorBoundary>
        
        {/* Vercel Analytics and Speed Insights */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
