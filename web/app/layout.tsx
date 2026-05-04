import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subway Kids",
  description: "Move your body to control the runner!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-brand-dark">{children}</body>
    </html>
  );
}
