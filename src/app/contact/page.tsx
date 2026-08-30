import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import JsonLd from "@/components/JsonLd";
import { contactPageJsonLd, fetchSiteSettings, publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "Contact us",
  "Call, message, or visit Palm Pizza Kitchen in Kigali. Questions, catering, and pizza orders - we are ready to help.",
  "/contact",
);

export default async function ContactPage() {
  const settings = await fetchSiteSettings();
  return (
    <>
      <JsonLd data={contactPageJsonLd(settings)} />
      <PageHero
        title="Contact"
        subtitle="Questions, catering, or feedback - our kitchen team is ready to help."
      />
      <section className="bg-pam-warm py-12 md:py-16">
        <div className="mx-auto grid max-w-[1600px] gap-10 px-5 md:grid-cols-2 md:px-8">
          <ContactInfo />
          <ContactForm />
        </div>
      </section>
    </>
  );
}
