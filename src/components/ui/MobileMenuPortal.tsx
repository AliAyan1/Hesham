"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders children on document.body so full-screen menus aren't clipped by header `filter`/blur. */
export function MobileMenuPortal({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(children, document.body);
}
