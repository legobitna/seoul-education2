import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AppShell } from "@/components/layout/AppShell";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "회의록 자동화",
  description: "회의 녹음 → AI 회의록 → 자동 메일 발송",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-slate-50">
        <Header />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
