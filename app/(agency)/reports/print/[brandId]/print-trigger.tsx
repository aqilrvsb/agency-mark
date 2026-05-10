"use client";

import { useEffect } from "react";

export function PrintTrigger({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [auto]);
  return null;
}
