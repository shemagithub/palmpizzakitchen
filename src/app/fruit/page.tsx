import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import FruitCatalog from "@/components/FruitCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Fruit parts in Kigali",
  "Fresh fruit cups, slices, and fruit plates from Palm Pizza Kitchen. Add fruit parts to your Kigali delivery order.",
  "/fruit",
  {
    image:
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Fruit parts from Palm Pizza Kitchen",
  },
);

export default function FruitPage() {
  return (
    <>
      <MenuCategoryJsonLd
        title="Fruit parts"
        path="/fruit"
        category="fruit"
      />
      <PageHero
        title="Fruit parts"
        subtitle="Fresh fruit cups, slices, and plates — cut and ready with your order."
      />
      <FruitCatalog />
    </>
  );
}
