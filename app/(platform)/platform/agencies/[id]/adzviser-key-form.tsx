"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function AdzviserKeyForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: {
    api_key?: string | null;
    workspace_id?: string | null;
    notes?: string | null;
    is_active?: boolean | null;
  } | null;
}) {
  const [apiKey, setApiKey] = useState(initial?.api_key ?? "");
  const [workspaceId, setWorkspaceId] = useState(initial?.workspace_id ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");

    const res = await fetch(`/api/platform/adzviser-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, api_key: apiKey, workspace_id: workspaceId, notes }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus("err");
      setErrorMsg(json.error ?? "Save failed");
    } else {
      setStatus("ok");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Adzviser API Key</label>
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="adv_live_..." />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">BigQuery Dataset (workspace)</label>
        <Input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="agency_abc_workspace" />
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">The BigQuery dataset where Adzviser writes this agency&apos;s tables.</p>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Notes (private)</label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Workspace ID: 12345 in Adzviser" />
      </div>

      {status === "ok" && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> Saved
        </div>
      )}
      {status === "err" && (
        <div className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5" /> {errorMsg}
        </div>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save configuration"}
      </Button>
    </form>
  );
}
