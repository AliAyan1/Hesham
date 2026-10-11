"use client";

import { useEffect } from "react";

/**
 * Hostinger serves pages on apex but 308-redirects API POSTs to www (body lost → login fails).
 * Send users to www before they submit credentials.
 */
export function AuthCanonicalHost() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== "basalim-consulting.com") return;
    const target = window.location.href.replace(
      "//basalim-consulting.com",
      "//www.basalim-consulting.com",
    );
    window.location.replace(target);
  }, []);

  return null;
}
