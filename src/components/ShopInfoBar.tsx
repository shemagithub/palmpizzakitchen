"use client";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

function dial(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export default function ShopInfoBar() {
  const { settings, loading } = useSiteSettings();
  if (loading) return null;

  const phone = settings.phone.trim();
  const hours = settings.open_hours.trim();
  const address = settings.address.trim();
  const whatsapp = settings.social_whatsapp.trim();
  if (!phone && !hours && !address && !whatsapp) return null;

  const maps = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  return (
    <div className="border-b border-pam-border/70 bg-white md:hidden">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-2">
        {hours ? (
          <span className="shrink-0 rounded-full bg-pam-sand px-3 py-2 text-xs font-bold text-pam-ink">
            {hours}
          </span>
        ) : null}
        {phone ? (
          <a
            href={`tel:${dial(phone)}`}
            className="shrink-0 rounded-full bg-pam-red px-3 py-2 text-xs font-bold text-white"
          >
            Call {phone}
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
          >
            WhatsApp
          </a>
        ) : null}
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
          >
            {address}
          </a>
        ) : null}
      </div>
    </div>
  );
}
