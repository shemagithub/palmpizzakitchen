import type { Metadata } from "next";
import { Suspense } from "react";
import OffersOrderClient from "./OffersOrderClient";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Order with promo",
  "Pick your pizzas or burgers for a Palm Pizza Kitchen deal and add to cart at the promo price.",
  "/offers/order",
);

export default function OffersOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-5 py-20 text-center text-sm text-pam-muted">
          Loading offer…
        </div>
      }
    >
      <OffersOrderClient />
    </Suspense>
  );
}
