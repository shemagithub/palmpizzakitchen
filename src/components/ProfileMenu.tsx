"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BagIcon, UserIcon } from "@/components/icons";
import {
  useAuthUser,
  userAvatarUrl,
  userInitials,
} from "@/hooks/useAuthUser";
import { clearSession, type StoredUser } from "@/lib/api";

type Variant = "header" | "mobile" | "bottom";

type Props = {
  variant?: Variant;
  className?: string;
  onNavigate?: () => void;
};

function AvatarFace({
  user,
  sizeClass,
  textClass,
}: {
  user: StoredUser | null;
  sizeClass: string;
  textClass: string;
}) {
  const avatar = userAvatarUrl(user);
  const initials = userInitials(user);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [avatar]);

  if (avatar && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        onError={() => setBroken(true)}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-pam-red font-[family-name:var(--font-oswald)] font-bold tracking-wide text-white ${textClass}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export default function ProfileMenu({
  variant = "header",
  className = "",
  onNavigate,
}: Props) {
  const router = useRouter();
  const { user, ready, isLoggedIn } = useAuthUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [user?.id, user?.email]);

  const logout = () => {
    clearSession();
    setOpen(false);
    onNavigate?.();
    router.push("/account");
  };

  const go = () => {
    setOpen(false);
    onNavigate?.();
  };

  const triggerClass =
    variant === "header"
      ? "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-pam-muted transition hover:bg-pam-sand hover:text-pam-ink"
      : variant === "mobile"
        ? "soft-card flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-pam-ink"
        : "flex w-14 flex-col items-center gap-1 pb-1";

  const panelAlign =
    variant === "bottom"
      ? "bottom-[calc(100%+0.65rem)] right-0 left-auto w-[min(16rem,calc(100vw-1.5rem))]"
      : "right-0 top-[calc(100%+0.45rem)] w-[min(16rem,calc(100vw-1.5rem))]";

  if (!ready) {
    return (
      <span className={`${triggerClass} ${className}`} aria-hidden>
        <span className="h-5 w-5 animate-pulse rounded-full bg-pam-sand" />
      </span>
    );
  }

  if (!isLoggedIn) {
    if (variant === "bottom") {
      return (
        <Link
          href="/account"
          onClick={onNavigate}
          className={`${triggerClass} text-pam-muted ${className}`}
        >
          <UserIcon className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Profile</span>
        </Link>
      );
    }
    return (
      <Link
        href="/account"
        aria-label="Sign in"
        onClick={onNavigate}
        className={`${triggerClass} ${className}`}
      >
        <UserIcon className="h-5 w-5" />
      </Link>
    );
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] || "You";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`${triggerClass} ${
          variant === "bottom"
            ? open
              ? "text-pam-red"
              : "text-pam-muted"
            : ""
        }`}
      >
        {variant === "bottom" ? (
          <>
            <AvatarFace
              user={user}
              sizeClass="h-7 w-7"
              textClass="text-[10px]"
            />
            <span className="max-w-[3.4rem] truncate text-[11px] font-semibold text-pam-ink">
              {firstName}
            </span>
          </>
        ) : (
          <AvatarFace
            user={user}
            sizeClass={variant === "mobile" ? "h-9 w-9" : "h-9 w-9"}
            textClass="text-[11px]"
          />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-[80] overflow-hidden rounded-2xl border border-pam-border/80 bg-white shadow-[0_18px_40px_rgba(28,25,23,0.16)] ${panelAlign}`}
        >
          <div className="border-b border-pam-border/70 bg-pam-sand/50 px-3.5 py-3">
            <p className="truncate text-sm font-extrabold text-pam-ink">
              {user?.name || "Your account"}
            </p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-pam-muted">
                {user.email}
              </p>
            )}
          </div>

          <div className="p-1.5">
            <Link
              href="/account?manage=1"
              role="menuitem"
              onClick={go}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-pam-ink transition hover:bg-pam-sand"
            >
              <UserIcon className="h-4 w-4 text-pam-muted" />
              Profile
            </Link>
            <Link
              href="/orders"
              role="menuitem"
              onClick={go}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-pam-ink transition hover:bg-pam-sand"
            >
              <BagIcon className="h-4 w-4 text-pam-muted" />
              My orders
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={go}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-pam-ink transition hover:bg-pam-sand"
              >
                <span className="flex h-4 w-4 items-center justify-center text-[10px] font-extrabold text-pam-red">
                  A
                </span>
                Shop manager
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-pam-red transition hover:bg-pam-red/8"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
