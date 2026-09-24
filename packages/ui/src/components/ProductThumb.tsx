"use client";

import type { CSSProperties } from "react";

/**
 * Every mock retailer's `image` field is a single emoji (`"🧈"`) meant to be rendered as
 * oversized text — real Zepto's is a real CDN photo URL. Rendering both the same way (as
 * this codebase did everywhere `card.image`/`line.image` was used) means a real product
 * shows its raw image URL as literal text instead of a picture. This picks the right
 * rendering per value instead of assuming every source looks like the mock ones.
 */
export function ProductThumb({ image, alt = "", size, fill = false }: { image: string; alt?: string; size?: number; fill?: boolean }) {
  const isUrl = /^https?:\/\//.test(image);

  if (!isUrl) {
    return <span style={size ? { fontSize: size, lineHeight: 1 } : { lineHeight: 1 }}>{image}</span>;
  }

  const style: CSSProperties = fill
    ? { width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }
    : { width: size ?? 32, height: size ?? 32, objectFit: "cover", borderRadius: 8, verticalAlign: "middle" };
  return <img src={image} alt={alt} style={style} />;
}
