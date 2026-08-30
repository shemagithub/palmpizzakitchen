import type { MetadataRoute } from "next";
import { fetchMenuItems, sitePath } from "@/lib/seo";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: sitePath("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: sitePath("/pizzas"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: sitePath("/combos"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sitePath("/sides"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sitePath("/drinks"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sitePath("/burgers"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: sitePath("/offers"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: sitePath("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: sitePath("/pick"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: sitePath("/faq"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: sitePath("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: sitePath("/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: sitePath("/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: sitePath("/refund"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const items = await fetchMenuItems();
  for (const item of items) {
    if (!item?.id) continue;
    pages.push({
      url: sitePath(`/product/${item.id}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return pages;
}
