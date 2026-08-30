import type { Metadata } from "next";
import AboutPageView from "@/components/AboutPageView";
import JsonLd from "@/components/JsonLd";
import { aboutPageJsonLd, fetchSiteSettings, publicPageMeta } from "@/lib/seo";

export const metadata: Metadata = publicPageMeta(
  "About our kitchen",
  "Palm Pizza Kitchen in Kigali, Rwanda - stone ovens, fresh toppings, and pizza delivered hot. Learn our story.",
  "/about",
);

export default async function AboutPage() {
  const settings = await fetchSiteSettings();
  return (
    <>
      <JsonLd data={aboutPageJsonLd(settings)} />
      <AboutPageView />
    </>
  );
}
