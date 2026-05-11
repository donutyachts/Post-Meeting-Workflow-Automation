import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Post-Meeting Workflow",
  description: "Automate meeting summaries, Slack posting, and Notion logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} app-shell`}>
        <nav className="app-nav">
          <span className="app-nav-brand">Post-Meeting Workflow</span>
          <Link href="/action-items" className="app-nav-link">Action items</Link>
          <Link href="/runs" className="app-nav-link">Run History</Link>
          <Link href="/projects" className="app-nav-link">Projects</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
