import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MascotDefs } from "@/components/landing/mascot-defs";
import { Toaster } from "@/components/ui/sonner";

const geistHeading = Geist({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const lora = Lora({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse",
  description: "Stop Counting Streaks. Start Building Character.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        lora.variable,
        geist.variable,
        geistHeading.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <MascotDefs />
        {children}
        <Toaster richColors />
      </body>
    </html>
  );
}
