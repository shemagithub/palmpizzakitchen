import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ProductPageClient from "@/components/ProductPageClient";
import { getAllMenuItems } from "@/data/menu";
import {
  fetchMenuItem,
  productPageJsonLdForItem,
  publicPageMeta,
  SEO,
  sitePath,
  socialImageUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://backend.palmpizzakitchen.com/api"
  ).replace(/\/$/, "");
  // Shared shell for products added after this static build (cPanel rewrite).
  const byId = new Map<string, { id: string }>([["__view__", { id: "__view__" }]]);
  for (const item of getAllMenuItems()) {
    if (item.id) byId.set(item.id, { id: item.id });
  }
  try {
    const res = await fetch(`${base}/menu`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { items?: { id: string }[] };
      for (const item of data.items || []) {
        if (item?.id) byId.set(item.id, { id: item.id });
      }
    }
  } catch {
    /* seed + shell already included */
  }
  return Array.from(byId.values());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (id === "__view__") {
    return publicPageMeta(
      "Menu item",
      `Order from ${SEO.name} in Kigali, Rwanda.`,
      "/pizzas",
    );
  }
  const item = await fetchMenuItem(id);
  if (!item) {
    const fallback = id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return publicPageMeta(
      fallback,
      `Order ${fallback} from ${SEO.name} in Kigali, Rwanda.`,
      `/product/${id}`,
    );
  }
  const description =
    item.description ||
    `Order ${item.name} from ${SEO.name}. Hot pizza delivery in Kigali, Rwanda.`;
  const title = `${item.name} - Kigali delivery`;
  const photos = [item.image, ...(item.images || [])].filter(Boolean);
  const primary = socialImageUrl(item.image);
  const extra = photos.slice(1).map((src) => ({
    url: socialImageUrl(src),
    width: 1200,
    height: 630,
    alt: item.name,
  }));
  return {
    ...publicPageMeta(title, description, `/product/${id}`, {
      image: item.image,
      imageAlt: item.name,
    }),
    openGraph: {
      type: "website",
      url: sitePath(`/product/${id}`),
      title: `${item.name} | ${SEO.name}`,
      description,
      siteName: SEO.name,
      images: [
        { url: primary, width: 1200, height: 630, alt: item.name },
        ...extra,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.name} | ${SEO.name}`,
      description,
      images: [primary],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const item = await fetchMenuItem(id);
  const jsonLd = item ? await productPageJsonLdForItem(item) : null;
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <ProductPageClient id={id} />
    </>
  );
}
