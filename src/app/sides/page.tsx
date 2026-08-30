import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import SidesCatalog from "@/components/SidesCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Sides & extras",
  "Garlic bread, wings, mozzarella sticks, and more sides to go with your Palm Pizza Kitchen order in Kigali.",
  "/sides",
  {
    image:
      "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Sides from Palm Pizza Kitchen",
  },
);

export default function SidesPage() {
  return (
    <>
      <MenuCategoryJsonLd title="Sides & extras" path="/sides" category="side" />
      <PageHero
        title="Sides"
        subtitle="The perfect partners for your pizza - crispy, cheesy, and made to share."
      />
      <SidesCatalog />
    </>
  );
}
