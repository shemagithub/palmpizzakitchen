import type { Metadata } from "next";
import OrdersClient from "./OrdersClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "My Orders",
  "Track your Palm Pizza Kitchen orders.",
);

export default function OrdersPage() {
  return <OrdersClient />;
}
