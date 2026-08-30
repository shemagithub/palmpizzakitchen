"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-V8HDZXY5KC";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (!GA_ID || isAdmin) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
