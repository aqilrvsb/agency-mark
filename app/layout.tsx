import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
  variable: "--peninglab-font-display",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--peninglab-font-body",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--peninglab-font-mono",
});

export const metadata: Metadata = {
  title: "PeningAds.my : Sistem urus iklan FB & TikTok untuk agensi",
  description:
    "Platform SaaS untuk agensi yang manage 100+ akaun iklan klien. Dashboard FB+TikTok dalam satu, white-label client portal, billing automatik.",
  metadataBase: new URL("https://PeningAds.my"),
  openGraph: {
    title: "PeningAds.my : Sistem urus iklan FB & TikTok untuk agensi",
    description:
      "Platform SaaS untuk agensi urus 100+ akaun iklan FB & TikTok dalam satu dashboard.",
    type: "website",
    locale: "ms_MY",
    siteName: "PeningAds",
  },
  twitter: {
    card: "summary_large_image",
    title: "PeningAds.my",
    description:
      "Sistem urus iklan FB & TikTok untuk agensi.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className={`h-full ${bricolage.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
