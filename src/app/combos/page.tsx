import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import CombosCatalog from "@/components/CombosCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Pizza combos",
  "Family feasts, couple combos, and party packs from Palm Pizza Kitchen in Kigali. Bigger meals, better value.",
  "/combos",
  {
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Pizza combos in Kigali",
  },
);

export default function CombosPage() {
  return (
    <>
      <MenuCategoryJsonLd title="Pizza combos" path="/combos" category="combo" />
      <PageHero
        title="Combos"
        subtitle="Bigger value meals for date night, family dinner, or the whole party."
      />
      <CombosCatalog />
    </>
  );
}
