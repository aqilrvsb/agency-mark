"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";

interface Note {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

export function NotesSection({ brandId, initialNotes }: { brandId: string; initialNotes: Note[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/agency/brand-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId, body: body.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      setError(errBody.error || "Failed to save note");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note for the team — meeting outcome, client request, blocker, etc."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-sm resize-y"
        />
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">{error}</div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !body.trim()} size="sm">
            <StickyNote className="w-4 h-4" />
            {submitting ? "Adding..." : "Add note"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {initialNotes.length === 0 && (
          <div className="text-sm text-[var(--color-text-muted)] py-4 text-center">
            No notes yet. Add the first one above.
          </div>
        )}
        {initialNotes.map((n) => (
          <div key={n.id} className="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
              <span className="font-bold text-[var(--color-text-primary)]">{n.author_name ?? "—"}</span>
              <span>{new Date(n.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
