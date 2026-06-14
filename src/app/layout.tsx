import type { Metadata } from "next";
import { Roboto, Inter } from "next/font/google";

import "./globals.css";
import { cn } from "@/src/utils/cn";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400","500","700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Talkmaze",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={roboto.variable}
      >
       {children}
      </body>
    </html>
  );
}
