"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function SyncNowButton({ companyId, hasConfig }: { companyId: string; hasConfig: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function syncNow() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/platform/sync-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    const json = await res.json();
    setResult({ ok: res.ok, message: json.error ?? `Synced ${(json.rows?.meta ?? 0) + (json.rows?.tiktok ?? 0) + (json.rows?.meta_insights ?? 0)} rows` });
    setLoading(false);
    if (res.ok) {
      // Reload after 1.5s to show updated last_synced_at
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  return (
    <div>
      <Button onClick={syncNow} disabled={loading || !hasConfig}>
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync now"}
      </Button>
      {!hasConfig && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Configure Adzviser key first.
        </p>
      )}
      {result && (
        <div className={`flex items-start gap-2 text-sm mt-3 ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
          {result.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          {result.message}
        </div>
      )}
    </div>
  );
}
