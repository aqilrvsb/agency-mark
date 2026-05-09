"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export function AddAdAccountForm({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"meta_ads" | "tiktok_ads" | "meta_insights">("meta_ads");
  const [externalId, setExternalId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/agency/ad-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: brandId,
        platform,
        external_account_id: externalId.trim(),
        external_account_name: externalName.trim() || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to add ad account");
      return;
    }
    setExternalId("");
    setExternalName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <Plus className="w-4 h-4" /> Add ad account
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">Add ad account</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as "meta_ads" | "tiktok_ads" | "meta_insights")}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
        >
          <option value="meta_ads">Facebook Ads</option>
          <option value="meta_insights">Facebook Page Insights</option>
          <option value="tiktok_ads">TikTok Ads</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
          External Account ID
        </label>
        <Input
          required
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder="act_123456789 or 7012345678901234"
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Connect this account in your Zernio dashboard first, then paste its ID here.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
          Name (optional)
        </label>
        <Input
          value={externalName}
          onChange={(e) => setExternalName(e.target.value)}
          placeholder="Friendly label, e.g. 'Brand X — Main Account'"
        />
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !externalId.trim()} size="sm">
          {loading ? "Adding..." : "Add"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}
