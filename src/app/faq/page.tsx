import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PageHero from "@/components/PageHero";
import { shopFaqItems } from "@/data/faq";
import { faqJsonLd, fetchSiteSettings, publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "FAQ - pizza delivery in Kigali",
  "Answers about Palm Pizza Kitchen delivery areas, opening hours, payment, and ordering pizza in Kigali, Rwanda.",
  "/faq",
  { image: "/promo-1.jpg", imageAlt: "Palm Pizza Kitchen FAQ" },
);

export default async function FaqPage() {
  const settings = await fetchSiteSettings();
  const items = shopFaqItems(settings);

  return (
    <>
      <JsonLd data={faqJsonLd(items)} />
      <PageHero
        title="Questions"
        subtitle="Delivery, hours, payment, and ordering - the details people ask most before they add a pizza to the cart."
      />
      <section className="bg-pam-warm py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <dl className="space-y-4">
            {items.map((item) => (
              <div
                key={item.question}
                className="rounded-3xl border border-pam-border bg-pam-surface px-5 py-5 md:px-6"
              >
                <dt className="font-[family-name:var(--font-oswald)] text-xl tracking-[0.02em] text-pam-ink">
                  {item.question}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-pam-muted md:text-base">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
