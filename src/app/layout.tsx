import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevReactGrab } from "@/components/dev-react-grab";
import "@/bones/registry";
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
  title: "Edgar Review | SEC Filing Analysis",
  description: "Search stocks and review SEC EDGAR filings for financial modeling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <DevReactGrab />
      </body>
    </html>
  );
}
