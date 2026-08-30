"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearSession,
  getStoredUser,
  getToken,
  resolveMediaUrl,
  type StoredUser,
} from "@/lib/api";

export function userInitials(user: StoredUser | null | undefined) {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user?.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function userAvatarUrl(user: StoredUser | null | undefined) {
  const raw = user?.avatar || user?.image || user?.photo || "";
  if (!raw.trim()) return null;
  return resolveMediaUrl(raw.trim());
}

export function useAuthUser() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextToken = getToken();
    setToken(nextToken);
    if (!nextToken) {
      setUser(null);
      setReady(true);
      return;
    }

    const cached = getStoredUser();
    setUser(cached);

    try {
      const data = await api<{ user: StoredUser & { emailVerified?: boolean } }>(
        "/auth/me",
      );
      const nextUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };
      setUser(nextUser);
      localStorage.setItem("palm_user", JSON.stringify(nextUser));
    } catch {
      clearSession();
      setUser(null);
      setToken(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("palm-auth-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("palm-auth-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return {
    user,
    ready,
    isLoggedIn: Boolean(token && user),
    refresh,
  };
}
