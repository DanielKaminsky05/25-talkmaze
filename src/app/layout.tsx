import type { Metadata } from "next";
import { Roboto, Inter } from "next/font/google";

import "./globals.css";
import { cn } from "@/src/utils/cn";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Talkmaze",
    template: "%s | Talkmaze",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(roboto.variable, inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
