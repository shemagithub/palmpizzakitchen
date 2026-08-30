"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DocumentBrandIcons } from "@/components/BrandLogo";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileHeader from "@/components/MobileHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import SiteSettingsProvider from "@/components/SiteSettingsProvider";
import MenuProvider from "@/components/MenuProvider";
import { PalmPickFab } from "@/components/PalmPickSection";
import ViewportSwitch from "@/components/ViewportSwitch";

export default function StoreShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return (
    <SiteSettingsProvider>
      <DocumentBrandIcons />
      <MenuProvider>
        {isAdmin ? (
          children
        ) : (
          <>
            <ViewportSwitch
              mobile={<MobileHeader />}
              desktop={<Header />}
              fallback={
                <div
                  className="h-16 border-b border-pam-border/60 bg-[#f7f4ef]/95 md:h-[4.5rem]"
                  aria-hidden
                />
              }
            />
            <main className="min-h-[70vh] pb-24 md:pb-0">{children}</main>
            <PalmPickFab />
            <Footer />
            <div className="md:hidden">
              <MobileBottomNav />
            </div>
          </>
        )}
      </MenuProvider>
    </SiteSettingsProvider>
  );
}
