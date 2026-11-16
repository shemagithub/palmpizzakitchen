import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import AlcoholCatalog from "@/components/AlcoholCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Wine and bar in Kigali",
  "Wine, champagne, beer, cocktails, and other alcohol from Palm Pizza Kitchen. For guests 18 and over.",
  "/bar",
  {
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Wine and champagne from Palm Pizza Kitchen",
  },
);

export default function BarPage() {
  return (
    <>
      <MenuCategoryJsonLd
        title="Wine and bar"
        path="/bar"
        category="alcohol"
      />
      <PageHero
        title="Wine & bar"
        subtitle="Wine, champagne, beer, cocktails, and other alcohol. Guests 18 and over."
      />
      <AlcoholCatalog />
    </>
  );
}
