"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-pam-red text-white shadow-[0_10px_24px_rgba(227,24,55,0.28)] hover:bg-[#c91430]"
      : "bg-pam-ink text-white hover:bg-pam-ink/90";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[121] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_60px_rgba(28,25,23,0.28)] sm:rounded-3xl"
      >
        <div className="border-b border-pam-border/70 bg-pam-sand/50 px-5 py-4">
          <p className="text-[11px] font-bold tracking-[0.16em] text-pam-red uppercase">
            Please confirm
          </p>
          <h2
            id={titleId}
            className="mt-1 font-[family-name:var(--font-oswald)] text-2xl tracking-wide text-pam-ink"
          >
            {title}
          </h2>
        </div>

        <div className="px-5 py-5">
          <div id={descId} className="text-sm leading-relaxed text-pam-ink/85">
            {description}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="min-h-11 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className={`min-h-11 rounded-2xl px-5 py-3 text-sm font-bold disabled:opacity-60 ${confirmClass}`}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
