"use client";

import { useEffect } from "react";
import AboutStory from "@/components/AboutStory";
import Features from "@/components/Features";
import PageHero from "@/components/PageHero";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function AboutPageView() {
  const { settings, loading, refresh } = useSiteSettings();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="bg-pam-warm">
        <div className="mx-auto max-w-[1600px] space-y-4 px-5 py-12 md:px-8">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-pam-sand" />
          <div className="h-12 w-64 animate-pulse rounded-lg bg-pam-sand" />
          <div className="h-16 max-w-2xl animate-pulse rounded-lg bg-pam-sand" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero title="About" subtitle={settings.about_subtitle} />
      <Features />
      <AboutStory />
    </>
  );
}
