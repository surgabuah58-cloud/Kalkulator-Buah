import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SeasonProvider } from "@/context/season-context";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Surga Buah — Supply Chain Dashboard",
  description: "Platform internal manajemen supply chain & pricing distribusi buah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        <SeasonProvider>
          <LayoutShell>{children}</LayoutShell>
          <Toaster richColors position="top-right" />
        </SeasonProvider>
      </body>
    </html>
  );
}
