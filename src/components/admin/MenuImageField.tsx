"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { apiUpload, resolveMediaUrl } from "@/lib/api";

type Props = {
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
  label?: string;
};

function looksLikeImageUrl(value: string) {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/uploads/")) return true;
  if (v.startsWith("data:image/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(file.name || "");
}

export default function MenuImageField({
  value,
  onChange,
  onError,
  label = "Menu image",
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [status, setStatus] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setPreviewBroken(false);
  }, [value]);

  const reportError = useCallback(
    (message: string) => {
      setLocalError(message);
      setStatus("");
      onError?.(message);
    },
    [onError],
  );

  const setUrl = useCallback(
    (url: string, note?: string) => {
      onChange(url);
      setStatus(note || "");
      setLocalError("");
      setPreviewBroken(false);
    },
    [onChange],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        reportError("Please choose an image file (JPG, PNG, WEBP…).");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reportError("Image is too large (max 8MB).");
        return;
      }

      setUploading(true);
      setLocalError("");
      setStatus("Uploading…");
      try {
        const form = new FormData();
        form.append("image", file, file.name || "photo.jpg");
        const data = await apiUpload<{ url: string }>("/upload", form);
        if (!data?.url) throw new Error("Upload did not return an image URL.");
        setUrl(data.url, `Uploaded · ${file.name || "photo"}`);
      } catch (err) {
        reportError(
          err instanceof Error ? err.message : "Upload failed. Try again.",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [reportError, setUrl],
  );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
      return;
    }
    const uri =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (uri && looksLikeImageUrl(uri.split("\n")[0] || "")) {
      setUrl(uri.split("\n")[0].trim(), "Image address added");
    }
  };

  const onPasteUrl = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (looksLikeImageUrl(text)) {
      window.setTimeout(() => setStatus("Image address pasted"), 0);
    }
  };

  const onPasteZone = (e: ClipboardEvent<HTMLDivElement>) => {
    const file = e.clipboardData.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      void uploadFile(file);
      return;
    }
    const text = e.clipboardData.getData("text").trim();
    if (looksLikeImageUrl(text)) {
      e.preventDefault();
      setUrl(text, "Image address pasted");
    }
  };

  const hasPreview = Boolean(value.trim()) && !previewBroken;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        {status && (
          <span className="text-[11px] font-semibold text-pam-basil">
            {status}
          </span>
        )}
      </div>

      {localError ? (
        <div className="rounded-xl bg-pam-red/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-pam-red">
          {localError}
        </div>
      ) : null}

      <div
        tabIndex={0}
        onPaste={onPasteZone}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-3 transition outline-none focus:border-pam-red/40 ${
          dragging
            ? "border-pam-red bg-pam-red/5"
            : "border-pam-border bg-pam-sand/40"
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <div className="relative mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-xl bg-white ring-1 ring-pam-border/70">
            {hasPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(value)}
                alt="Menu preview"
                className="h-full w-full object-cover"
                onError={() => setPreviewBroken(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                <span className="text-[11px] font-semibold text-pam-muted">
                  {previewBroken ? "Preview failed" : "No image yet"}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-bold text-pam-ink">
                Uploading…
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-2">
            <p className="text-sm font-bold text-pam-ink">
              {dragging
                ? "Drop photo here"
                : "Upload a photo from your phone or computer"}
            </p>
            <p className="text-xs leading-relaxed text-pam-muted">
              Tap <strong>Upload photo</strong>, or drag a picture into this
              box. You can also paste a picture link in the field below.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="relative inline-flex">
                <span
                  className={`rounded-xl bg-pam-ink px-3.5 py-2.5 text-xs font-bold text-white ${
                    uploading ? "opacity-60" : ""
                  }`}
                >
                  {uploading ? "Uploading…" : "Upload photo"}
                </span>
                <input
                  id={`${inputId}-file`}
                  ref={fileRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
                  disabled={uploading}
                  onChange={onFileChange}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  aria-label="Upload photo from your device"
                />
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  if (!fileRef.current || uploading) return;
                  fileRef.current.value = "";
                  fileRef.current.click();
                }}
                className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-60"
              >
                Browse files
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => setUrl("", "Image cleared")}
                  className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-semibold text-pam-muted"
          htmlFor={inputId}
        >
          Or paste / type a picture link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={inputId}
            className="input-field flex-1 rounded-2xl font-mono text-xs sm:text-sm"
            value={value}
            onPaste={onPasteUrl}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            placeholder="https://… or /uploads/…"
            inputMode="url"
          />
          <button
            type="button"
            onClick={() => {
              const url = value.trim();
              if (!url) {
                reportError("Paste or type an image link first.");
                return;
              }
              if (!looksLikeImageUrl(url)) {
                reportError(
                  "Enter a full image address starting with https:// or /uploads/…",
                );
                return;
              }
              setUrl(url, "Image address saved");
            }}
            className="rounded-2xl bg-pam-red px-4 py-3 text-xs font-bold text-white sm:shrink-0"
          >
            Use link
          </button>
        </div>
      </div>
    </div>
  );
}
