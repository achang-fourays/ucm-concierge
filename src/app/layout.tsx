import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UCM Executive Concierge",
  description: "Mobile-first concierge app for executive meeting travel, prep, and AI support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
