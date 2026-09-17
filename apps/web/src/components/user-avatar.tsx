"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  fallback?: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Checks if a string is a valid image URL or web path.
 */
function isImageUrl(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:")
  );
}

/**
 * Derives up to 2 uppercase initials from a user's full name.
 */
function getInitials(name?: string | null, fallback = "U"): string {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Production-ready UserAvatar component supporting image URLs (e.g. Google OAuth avatars)
 * with graceful fallback to user initials if the URL fails to load or is not an image.
 */
export function UserAvatar({
  src,
  name,
  fallback = "U",
  className,
  imageClassName,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const isUrl = isImageUrl(src);
  const showImage = isUrl && !hasError && !!src;

  if (showImage && src) {
    return (
      <img
        src={src}
        alt={name ? `Avatar ${name}` : "User Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn("w-full h-full object-cover rounded-[inherit]", imageClassName, className)}
      />
    );
  }

  // If src is not a URL, it may already be raw initials (e.g. "CC", "SA")
  const displayInitials =
    !isUrl && src && src.length <= 4
      ? src.toUpperCase()
      : getInitials(name, fallback);

  return (
    <span className={cn("select-none uppercase leading-none font-bold", className)}>
      {displayInitials}
    </span>
  );
}
