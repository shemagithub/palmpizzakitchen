import type { Metadata } from "next";
import { Great_Vibes, Nunito, Oswald } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import JsonLd from "@/components/JsonLd";
import StoreShell from "@/components/StoreShell";
import {
  fetchMenuItems,
  fetchSiteSettings,
  GOOGLE_SITE_VERIFICATION,
  restaurantJsonLd,
  SEO,
  SITE_URL,
  sitePath,
} from "@/lib/seo";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SEO.name} | Order pizza delivery in Kigali, Rwanda`,
    template: `%s | ${SEO.name}`,
  },
  description: SEO.description,
  keywords: SEO.keywords,
  applicationName: SEO.name,
  authors: [{ name: SEO.name, url: SITE_URL }],
  creator: SEO.name,
  publisher: SEO.name,
  category: "food",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SEO.name,
    title: `${SEO.name} | Order pizza delivery in Kigali, Rwanda`,
    description: SEO.description,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: `${SEO.name} logo`,
      },
      {
        url: "/promo-1.jpg",
        width: 1200,
        height: 630,
        alt: `${SEO.name} pizza delivery in Kigali`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SEO.name} | Pizza delivery in Kigali`,
    description: SEO.description,
    images: ["/promo-1.jpg"],
  },
  alternates: {
    canonical: sitePath("/"),
    types: {
      "text/plain": [{ url: "/llms.txt", title: "AI & LLM site guide" }],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "geo.region": "RW",
    "geo.placename": "Kigali",
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, items] = await Promise.all([
    fetchSiteSettings(),
    fetchMenuItems(),
  ]);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${oswald.variable} ${nunito.variable} ${greatVibes.variable} min-h-full antialiased`}
    >
      <body className="min-h-full bg-pam-warm font-[family-name:var(--font-nunito)] text-pam-ink">
        <GoogleAnalytics />
        <JsonLd data={restaurantJsonLd(settings, items)} />
        <StoreShell>{children}</StoreShell>
      </body>
    </html>
  );
}
