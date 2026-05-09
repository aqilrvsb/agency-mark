"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export function AgencyProfileForm({
  initial,
  canEdit,
}: {
  initial: { id: string; name: string; logo_url: string | null };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/agency/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), logo_url: logoUrl.trim() || null }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Save failed");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Agency name</label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Logo URL</label>
        <Input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          disabled={!canEdit}
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Used in the white-label client portal header.
        </p>
      </div>
      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> Saved
        </div>
      )}
      {canEdit && (
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      )}
      {!canEdit && (
        <p className="text-xs text-[var(--color-text-muted)]">Only BOD or platform admin can edit agency profile.</p>
      )}
    </form>
  );
}
