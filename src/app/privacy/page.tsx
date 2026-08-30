import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Privacy policy",
  "How Palm Pizza Kitchen in Kigali collects and uses information to process pizza orders and optional promotions.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy policy" />
      <section className="bg-pam-warm py-10 md:py-14">
        <div className="mx-auto max-w-3xl space-y-4 px-5 text-pam-muted md:px-8">
          <p>
            PAM Pizza Kitchen respects your privacy. We collect only the
            information needed to process orders, improve delivery, and share
            optional promotions you subscribe to.
          </p>
          <p>
            We never sell your personal data. Contact info@palmpizzakitchen.com
            for any privacy requests.
          </p>
        </div>
      </section>
    </>
  );
}
