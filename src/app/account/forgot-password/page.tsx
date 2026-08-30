import type { Metadata } from "next";
import ForgotPasswordClient from "@/components/ForgotPasswordClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Forgot password",
  "Reset your Palm Pizza Kitchen account password.",
);

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
