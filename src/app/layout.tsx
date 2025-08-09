import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/context-simple";
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
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
