import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SeasonProvider } from "@/context/season-context";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
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
          <div className="flex h-full">
            {/* Sidebar */}
            <AppSidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col pl-60">
              <AppHeader />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster richColors position="top-right" />
        </SeasonProvider>
      </body>
    </html>
  );
}
