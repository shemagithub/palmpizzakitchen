import type { Metadata } from "next";
import OffersClient from "./OffersClient";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Pizza offers & promo codes",
  "Current Palm Pizza Kitchen deals and promo codes in Kigali. Save on pizzas, combos, and delivery.",
  "/offers",
  { image: "/promo-2.jpg", imageAlt: "Palm Pizza Kitchen offers" },
);

export default function OffersPage() {
  return <OffersClient />;
}
