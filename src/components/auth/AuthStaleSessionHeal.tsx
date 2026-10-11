"use client";

import { useEffect } from "react";
import { healStaleAuthCookie } from "@/lib/auth-redirect";

/** Silently drops broken login cookies before the user submits the form. */
export function AuthStaleSessionHeal() {
  useEffect(() => {
    void healStaleAuthCookie();
  }, []);

  return null;
}
