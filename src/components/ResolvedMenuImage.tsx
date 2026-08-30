"use client";

import Image from "next/image";
import { resolveMediaUrl } from "@/lib/api";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
      draggable?: boolean;
      loading?: "eager" | "lazy";
    };

function needsNativeImg(src: string) {
  if (!src) return true;
  if (src.startsWith("/uploads/")) return true;
  if (src.startsWith("data:image/")) return true;
  if (src.startsWith("http") && !src.includes("images.unsplash.com")) {
    return true;
  }
  return false;
}

/** Menu/product photo that supports uploads + pasted remote URLs */
export default function ResolvedMenuImage({
  src,
  alt,
  fill,
  className = "",
  sizes,
  priority,
  draggable,
  loading,
}: Props) {
  const resolved = resolveMediaUrl(src);
  const nativeLoading = priority ? "eager" : loading || "lazy";

  if (needsNativeImg(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={
          fill
            ? `absolute inset-0 h-full w-full object-cover ${className}`
            : className
        }
        draggable={draggable}
        loading={nativeLoading}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      quality={70}
      draggable={draggable}
    />
  );
}
