import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Refund policy",
  "Refund and order-issue policy for Palm Pizza Kitchen deliveries in Kigali.",
  "/refund",
);

export default function RefundPage() {
  return (
    <>
      <PageHero title="Refund policy" />
      <section className="bg-pam-warm py-10 md:py-14">
        <div className="mx-auto max-w-3xl space-y-4 px-5 text-pam-muted md:px-8">
          <p>
            If something is wrong with your order, contact us within 30 minutes
            of delivery. We&apos;ll remake, replace, or refund eligible items.
          </p>
          <p>
            Refunds are processed to the original payment method within 3–5
            business days.
          </p>
        </div>
      </section>
    </>
  );
}
