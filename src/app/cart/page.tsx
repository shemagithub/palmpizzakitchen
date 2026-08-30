import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CartView from "@/components/CartView";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Cart",
  "Review your Palm Pizza Kitchen order.",
);

export default function CartPage() {
  return (
    <>
      <PageHero
        title="Your cart"
        subtitle="Almost there - hot pizza is just a checkout away."
      />
      <section className="bg-pam-warm px-4 py-8 md:px-8 md:py-14">
        <CartView />
      </section>
    </>
  );
}
