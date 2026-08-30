"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { apiUpload, resolveMediaUrl } from "@/lib/api";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  onError?: (message: string) => void;
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

export default function MenuGalleryField({ images, onChange, onError }: Props) {
  const fileInputId = useId();
  const linkInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [localError, setLocalError] = useState("");

  const reportError = useCallback(
    (message: string) => {
      setLocalError(message);
      setStatus("");
      onError?.(message);
    },
    [onError],
  );

  const addUrls = useCallback(
    (urls: string[], note?: string) => {
      const clean = urls.map((u) => u.trim()).filter(Boolean);
      if (!clean.length) return;
      const next = [...imagesRef.current];
      for (const url of clean) {
        if (!next.includes(url)) next.push(url);
      }
      imagesRef.current = next;
      onChange(next);
      setLocalError("");
      setStatus(note || `Added ${clean.length} photo${clean.length > 1 ? "s" : ""}`);
    },
    [onChange],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const list = Array.from(files || []).filter(isImageFile);
      if (!list.length) {
        reportError("Please choose image files (JPG, PNG, WEBP, GIF…).");
        return;
      }
      for (const file of list) {
        if (file.size > 8 * 1024 * 1024) {
          reportError(`${file.name || "Image"} is too large (max 8MB).`);
          return;
        }
      }

      setUploading(true);
      setLocalError("");
      setStatus(`Uploading ${list.length} photo${list.length > 1 ? "s" : ""}…`);
      try {
        const uploaded: string[] = [];
        for (const file of list) {
          const form = new FormData();
          form.append("image", file, file.name || "photo.jpg");
          const data = await apiUpload<{ url: string }>("/upload", form);
          if (data?.url) uploaded.push(data.url);
        }
        if (!uploaded.length) {
          throw new Error("Upload did not return an image URL.");
        }
        addUrls(
          uploaded,
          `Uploaded ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""}`,
        );
      } catch (err) {
        reportError(
          err instanceof Error ? err.message : "Upload failed. Try again.",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [addUrls, reportError],
  );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    void uploadFiles(files);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
      return;
    }
    const uri =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    const first = (uri.split("\n")[0] || "").trim();
    if (looksLikeImageUrl(first)) {
      addUrls([first], "Image address added");
    }
  };

  const addLink = (e?: FormEvent) => {
    e?.preventDefault();
    const url = link.trim();
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
    addUrls([url], "Image address added");
    setLink("");
  };

  const onLinkKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLink();
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    imagesRef.current = copy;
    onChange(copy);
  };

  const removeAt = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    imagesRef.current = next;
    onChange(next);
    setStatus("Photo removed");
    setLocalError("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Photos ({images.length})</p>
        {status ? (
          <span className="text-[11px] font-semibold text-pam-basil">{status}</span>
        ) : (
          <span className="text-[11px] text-pam-muted">
            First photo is the main image
          </span>
        )}
      </div>

      {localError ? (
        <div className="rounded-xl bg-pam-red/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-pam-red">
          {localError}
        </div>
      ) : null}

      <div
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
        className={`rounded-2xl border-2 border-dashed p-3 transition ${
          dragging
            ? "border-pam-red bg-pam-red/5"
            : "border-pam-border bg-pam-sand/40"
        }`}
      >
        {images.length > 0 ? (
          <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((url, index) => (
              <li
                key={`${url}-${index}`}
                className="relative overflow-hidden rounded-xl bg-white ring-1 ring-pam-border/70"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(url)}
                  alt={`Gallery ${index + 1}`}
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.35";
                  }}
                />
                {index === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-pam-red px-2 py-0.5 text-[10px] font-bold text-white">
                    Main
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] font-bold disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex-1 rounded-lg bg-white/90 py-1 text-[10px] font-bold disabled:opacity-40"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="flex-1 rounded-lg bg-pam-red py-1 text-[10px] font-bold text-white"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-center text-sm text-pam-muted">
            No photos yet. Upload from your device or paste an image link.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Opacity overlay input is more reliable than sr-only + label inside modals */}
          <div className="relative inline-flex">
            <span
              className={`rounded-xl bg-pam-ink px-3.5 py-2.5 text-xs font-bold text-white ${
                uploading ? "opacity-60" : ""
              }`}
            >
              {uploading ? "Uploading…" : "Select photos"}
            </span>
            <input
              id={fileInputId}
              ref={fileRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
              multiple
              disabled={uploading}
              onChange={onFileChange}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              aria-label="Select photos from your device"
            />
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              const input = fileRef.current;
              if (!input || uploading) return;
              input.value = "";
              input.click();
            }}
            className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-pam-ink ring-1 ring-pam-border disabled:opacity-60"
          >
            Browse files
          </button>
          <p className="text-xs text-pam-muted">
            Pick one or many images, or drag them here.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-pam-border/80">
        <label
          className="mb-1.5 block text-xs font-semibold text-pam-muted"
          htmlFor={linkInputId}
        >
          Or paste / type an image address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={linkInputId}
            className="input-field flex-1 rounded-2xl font-mono text-xs sm:text-sm"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={onLinkKeyDown}
            placeholder="https://… or /uploads/…"
            inputMode="url"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => addLink()}
            className="rounded-2xl bg-pam-red px-4 py-3 text-xs font-bold text-white sm:shrink-0"
          >
            Add link
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-pam-muted">
          Example: a Unsplash or CDN photo URL. The first image in the list is
          used as the main menu photo.
        </p>
      </div>
    </div>
  );
}
