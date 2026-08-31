"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";

/** Logged-in customers go to home unless they opened account settings on purpose. */
export default function AccountLandingRedirect() {
  const router = useRouter();
  const search = useSearchParams();
  const { user, ready, isLoggedIn } = useAuthUser();

  useEffect(() => {
    if (!ready || !isLoggedIn || !user) return;
    if (user.role === "admin") return;
    if (search.get("manage") === "1") return;
    router.replace("/");
  }, [ready, isLoggedIn, user, search, router]);

  return null;
}
