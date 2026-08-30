import type { Metadata } from "next";
import MenuCategoryJsonLd from "@/components/MenuCategoryJsonLd";
import PageHero from "@/components/PageHero";
import PizzasCatalog from "@/components/PizzasCatalog";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Pizzas in Kigali",
  "Browse classic, cheese, veggie, and meat pizzas from Palm Pizza Kitchen. Order hot pizza delivery in Kigali, Rwanda.",
  "/pizzas",
  {
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&h=630&q=70",
    imageAlt: "Pizzas from Palm Pizza Kitchen",
  },
);

export default function PizzasPage() {
  return (
    <>
      <MenuCategoryJsonLd
        title="Pizzas in Kigali"
        path="/pizzas"
        categories={["classic", "cheese", "veggie", "meat"]}
      />
      <PageHero
        title="Pizzas"
        subtitle="Stone-baked pies made fresh - from classic favorites to meat-loaded specials."
      />
      <PizzasCatalog />
    </>
  );
}
