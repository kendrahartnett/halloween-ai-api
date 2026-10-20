import type { Metadata } from "next";
import { Metal_Mania } from "next/font/google";
import "./globals.css";

const metalMania = Metal_Mania({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-metal" });

export const metadata: Metadata = {
  title: "The Black Glass",
  description: "Every answer comes with a price. A fictional haunted mirror experience.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nosifer&display=swap" rel="stylesheet" />
      </head>
      <body className={metalMania.variable}>{children}</body>
    </html>
  );
}
