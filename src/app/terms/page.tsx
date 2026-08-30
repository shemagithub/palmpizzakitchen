import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Terms of service",
  "Terms for ordering pizza from Palm Pizza Kitchen in Kigali, Rwanda.",
  "/terms",
);

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of service" />
      <section className="bg-pam-warm py-10 md:py-14">
        <div className="mx-auto max-w-3xl space-y-4 px-5 text-pam-muted md:px-8">
          <p>
            By ordering from PAM Pizza Kitchen, you agree to provide accurate
            delivery details and accept that estimated times may vary during
            peak hours.
          </p>
          <p>
            Menu availability and pricing can change without notice. Taxes and
            delivery fees are calculated at checkout.
          </p>
        </div>
      </section>
    </>
  );
}
