import type { Metadata, Viewport } from "next";
import { Outfit, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { GameStateProvider } from "@/lib/context/GameStateContext";
import { MainContainer } from "@/components/layout/MainContainer";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dream Team - Next-Gen Basketball",
  description: "A superior basketball management game",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="h-full bg-[radial-gradient(circle_at_center,_#1b2735_0%,_#090a0f_100%)] text-white overflow-hidden font-sans">
        <GameStateProvider>
          {/* Main App Container */}
          <div className="w-full h-[100dvh] flex flex-col relative overflow-hidden">
            <MainContainer>
              {children}
            </MainContainer>
          </div>
        </GameStateProvider>
      </body>
    </html>
  );
}
