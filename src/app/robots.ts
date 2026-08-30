import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const PRIVATE = [
  "/admin",
  "/admin/",
  "/cart",
  "/checkout",
  "/account",
  "/orders",
  "/payment",
  "/verify",
];

/** Public pages only — allow Google & AI crawlers (Gemini uses Google index). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
