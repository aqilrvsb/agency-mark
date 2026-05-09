"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export function MarkReadButton({ id, kind }: { id: string; kind: "notification" | "alert" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    await fetch("/api/agency/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={markRead}
      disabled={loading}
      title="Mark as read"
      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
    >
      <Check className="w-4 h-4" />
    </button>
  );
}
