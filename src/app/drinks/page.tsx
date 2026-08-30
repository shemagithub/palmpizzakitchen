import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import DrinksCatalog from "@/components/DrinksCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Drinks in Kigali",
  "Soft drinks, juice, and water to go with your Palm Pizza Kitchen order. Add drinks for delivery in Kigali.",
  "/drinks",
  {
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Drinks from Palm Pizza Kitchen",
  },
);

export default function DrinksPage() {
  return (
    <>
      <MenuCategoryJsonLd title="Drinks" path="/drinks" category="drink" />
      <PageHero
        title="Drinks"
        subtitle="Ice-cold sodas, juice, and water - the perfect pour next to a hot pizza."
      />
      <DrinksCatalog />
    </>
  );
}
