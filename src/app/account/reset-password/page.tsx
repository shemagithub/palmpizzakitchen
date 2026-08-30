import type { Metadata } from "next";
import ResetPasswordClient from "@/components/ResetPasswordClient";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Reset password",
  "Choose a new password for your Palm Pizza Kitchen account.",
);

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
