import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Patrick_Hand } from "next/font/google";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick",
  subsets: ["latin"],
  weight: ["400"],
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${patrickHand.variable} app-shell`}>
        <nav className="app-nav">
          <span className="app-nav-brand">Post-Meeting Workflow</span>
          <NavLinks />
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
