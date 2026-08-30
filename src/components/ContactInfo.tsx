"use client";

import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function ContactInfo() {
  const { settings } = useSiteSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-oswald)] text-2xl tracking-[0.04em] text-pam-ink">
          Kitchen info
        </h2>
        <p className="mt-3 text-pam-muted">{settings.phone}</p>
        <p className="text-pam-muted">{settings.email}</p>
        <p className="text-pam-muted">{settings.address}</p>
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-oswald)] text-xl tracking-[0.04em] text-pam-red">
          Hours
        </h3>
        <p className="mt-2 text-pam-muted">Mon – Sun: {settings.open_hours}</p>
      </div>
      {(settings.social_instagram ||
        settings.social_whatsapp) && (
        <div>
          <h3 className="font-[family-name:var(--font-oswald)] text-xl tracking-[0.04em] text-pam-ink">
            Social
          </h3>
          <div className="mt-2 flex flex-col gap-1 text-sm text-pam-muted">
            {settings.social_instagram && (
              <a
                href={settings.social_instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-pam-red"
              >
                Instagram
              </a>
            )}
            {settings.social_whatsapp && (
              <a
                href={settings.social_whatsapp}
                target="_blank"
                rel="noreferrer"
                className="hover:text-pam-red"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
