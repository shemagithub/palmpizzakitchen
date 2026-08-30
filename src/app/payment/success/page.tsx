import type { Metadata } from "next";
import PaymentResultClient from "../PaymentResultClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Payment",
  "Confirm your Palm Pizza Kitchen payment.",
);

export default function PaymentSuccessPage() {
  return <PaymentResultClient />;
}
