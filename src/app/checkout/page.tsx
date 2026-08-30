import type { Metadata } from "next";
import CheckoutPage from "./CheckoutClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Checkout",
  "Complete your Palm Pizza Kitchen order.",
);

export default function Page() {
  return <CheckoutPage />;
}
