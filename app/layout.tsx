import type { Metadata, Viewport } from "next";
import { Anton, Inter, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/data/site";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton-nf",
  display: "swap",
  adjustFontFallback: true,
});

const inter = Inter({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-inter-nf",
  display: "swap",
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono-nf",
  display: "swap",
  adjustFontFallback: true,
});

const caveat = Caveat({
  weight: ["600"],
  subsets: ["latin"],
  variable: "--font-caveat-nf",
  display: "swap",
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Shwetank Rai | Tech and Building",
  description: siteConfig.bio,
  authors: [{ name: siteConfig.name, url: siteConfig.instagramUrl }],
  creator: siteConfig.name,
  keywords: [
    "Shwetank Rai",
    "shwetdaily",
    "Tech and Building",
    "AI Tools",
    "Trading and Quant",
    "Machine Learning",
    "Web Building",
    "Build In Public",
  ],
  metadataBase: new URL("https://shwetdaily.com"),
  openGraph: {
    title: "Shwetank Rai | Tech and Building",
    description: siteConfig.bio,
    url: siteConfig.instagramUrl,
    siteName: "Shwetank Rai - @shwetdaily",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/avatar.webp",
        width: 1200,
        height: 1200,
        alt: siteConfig.avatarAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shwetank Rai | Tech and Building",
    description: siteConfig.bio,
    creator: "@shwetdaily",
    images: ["/avatar.webp"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable} ${caveat.variable} dark`}
    >
      <body className="min-h-screen bg-[#0A0A0A] text-[#F5F2E8] antialiased selection:bg-[#39FF14] selection:text-[#0A0A0A]">
        {children}
      </body>
    </html>
  );
}
