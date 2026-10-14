import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";
import { AnimationGovernor } from "@/components/ui/AnimationGovernor";
import { KeyboardSound } from "@/components/ui/KeyboardSound";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { MainShell } from "@/components/layout/MainShell";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { siteUrl } from "@/lib/site";

// Clean sans-serif for body text, headings, and subheadings
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Stylized technical font for hero headings and technical accents
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "Andropedia | Official Student Technology Club", template: "%s | Andropedia" },
  description: "Official platform of Andropedia: student technology club driving innovation in Technical, Web, Design, Media, and PR. Explore our domains, member evaluations, and live leaderboards.",
  keywords: [
    "Andropedia",
    "Student Tech Club",
    "Technology Club",
    "Web Development",
    "Competitive Programming",
    "UI/UX Design",
    "Leaderboard",
    "Weekly Task Evaluation"
  ],
  authors: [{ name: "Andropedia Tech Council" }],
  openGraph: {
    title: "Andropedia | Official Student Technology Club",
    description: "Pioneering technology, building creators. Explore domains, projects, hackathons, and live member leaderboards.",
    type: "website",
    siteName: "Andropedia",
  },
  twitter: { card: "summary_large_image", title: "Andropedia | Official Student Technology Club" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceMono.variable} h-full antialiased dark`}
    >
      <body className="relative min-h-full flex flex-col bg-black text-white font-sans selection:bg-[#0066ff]/40 selection:text-white">
        {/* Light highlighted blue gradient across the whole website */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-8%,rgba(0,102,255,0.16),transparent_70%),radial-gradient(ellipse_70%_45%_at_50%_105%,rgba(0,82,204,0.12),transparent_70%)]"
        />
        <MotionProvider>
          <AuthProvider>
            <CustomCursor />
            <KeyboardSound />
            <AnimationGovernor />
            <ConnectionBanner />
            <Navbar />
            <div className="relative z-10 flex flex-1 flex-col">
              <MainShell>{children}</MainShell>
            </div>
            <Footer />
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
