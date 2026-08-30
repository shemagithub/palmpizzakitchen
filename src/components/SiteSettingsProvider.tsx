"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  DEFAULT_SITE_SETTINGS,
  mergeSiteSettings,
  type SiteSettings,
} from "@/lib/siteSettings";

type Ctx = {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SiteSettingsContext = createContext<Ctx>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export default function SiteSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ settings: Record<string, string> }>("/settings");
      setSettings(mergeSiteSettings(data.settings));
    } catch {
      /* keep defaults offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("palm-settings-updated", onUpdate);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("palm-settings-updated", onUpdate);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, refresh }),
    [settings, loading, refresh],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
