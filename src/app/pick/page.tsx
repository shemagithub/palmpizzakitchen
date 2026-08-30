import type { Metadata } from "next";
import PalmPickExperience from "@/components/PalmPickExperience";
import { SEO } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Help me choose",
  description:
    "Answer a few questions and get a pizza suggestion from Palm Pizza Kitchen's live Kigali menu.",
  openGraph: {
    title: `Help me choose | ${SEO.name}`,
    description:
      "Quick menu helper — pick a pizza that fits your mood and appetite.",
  },
};

export default function PickPage() {
  return (
    <section className="bg-pam-warm py-10 md:py-14">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        <PalmPickExperience />
      </div>
    </section>
  );
}
