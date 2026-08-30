import type { Metadata } from "next";
import { Suspense } from "react";
import AccountForm from "@/components/AccountForm";
import BrandLogo from "@/components/BrandLogo";
import { privatePageMeta } from "@/lib/seo";

export const metadata: Metadata = privatePageMeta(
  "Account",
  "Sign in or create your Palm Pizza Kitchen account to track orders.",
);

export default function AccountPage() {
  return (
    <section className="bg-pam-warm py-8 md:py-14">
      <div className="mx-auto max-w-[1100px] px-4 md:px-8">
        <div className="mb-6 flex flex-col items-start gap-4 border-b border-pam-border pb-6 md:mb-8 md:flex-row md:items-center md:gap-5">
          <BrandLogo size="lg" href={null} />
          <div>
            <h1 className="font-[family-name:var(--font-oswald)] text-3xl text-pam-ink md:text-4xl">
              Your account
            </h1>
            <p className="mt-2 max-w-xl text-sm text-pam-muted md:text-base">
              Sign in to track orders and check out faster next time.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-xl border border-pam-border bg-pam-sand" />
          }
        >
          <AccountForm />
        </Suspense>
      </div>
    </section>
  );
}
