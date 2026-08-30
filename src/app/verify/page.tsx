import type { Metadata } from "next";
import VerifyClient from "@/components/VerifyClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Verify email",
  "Verify your Palm Pizza Kitchen account with the code sent to your email.",
);

export default function VerifyPage() {
  return <VerifyClient />;
}
