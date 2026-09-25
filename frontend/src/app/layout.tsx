import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../providers/QueryProvider";
import { RootBootGuard } from "../components/system/RootBootGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Wadaan Real Estate ERP | Financial Governance Core",
  description: "Real Estate & Construction Finance Suite for Wadaan Real Estate & Builders (Pvt) Ltd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F9FAFB] text-[#0F172A]">
        <QueryProvider>
          <RootBootGuard>
            {children}
          </RootBootGuard>
        </QueryProvider>
      </body>
    </html>
  );
}
