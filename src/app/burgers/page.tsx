import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import BurgersCatalog from "@/components/BurgersCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Burgers in Kigali",
  "Juicy beef, chicken, BBQ, and veggie burgers from Palm Pizza Kitchen. Order burgers for delivery in Kigali.",
  "/burgers",
  {
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Burgers from Palm Pizza Kitchen",
  },
);

export default function BurgersPage() {
  return (
    <>
      <MenuCategoryJsonLd title="Burgers in Kigali" path="/burgers" category="burger" />
      <PageHero
        title="Burgers"
        subtitle="Juicy, made-to-order burgers - beef, chicken, BBQ, and veggie, ready for your table."
      />
      <BurgersCatalog />
    </>
  );
}
