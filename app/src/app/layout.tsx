import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SolanaProviderClient } from "@/providers/solana-provider";
import { WalletProviderWrapper } from "@/providers/wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOLIMIT - Sports Betting on Solana",
  description: "Decentralized sports betting platform built with Gill SDK and Anchor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProviderWrapper>
          <SolanaProviderClient>{children}</SolanaProviderClient>
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
