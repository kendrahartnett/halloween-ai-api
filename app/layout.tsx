import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror, Mirror",
  description: "A haunted mirror that imagines eerie fictional futures.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
