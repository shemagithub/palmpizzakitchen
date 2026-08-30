import type { MetadataRoute } from "next";
import { SEO } from "@/lib/seo";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO.name,
    short_name: "Palm Pizza",
    description: SEO.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe6",
    theme_color: "#e31837",
    lang: "en",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
