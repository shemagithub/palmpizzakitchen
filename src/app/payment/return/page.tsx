import type { Metadata } from "next";
import PaymentResultClient from "../PaymentResultClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Payment result",
  "Finish your Palm Pizza Kitchen payment.",
);

export default function PaymentReturnPage() {
  return <PaymentResultClient />;
}
