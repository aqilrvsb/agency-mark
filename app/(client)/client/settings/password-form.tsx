"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function PasswordChangeForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setErrorMsg("");

    if (pw.length < 8) {
      setResult("err");
      setErrorMsg("Password mesti 8 chars minimum");
      return;
    }
    if (pw !== pw2) {
      setResult("err");
      setErrorMsg("Password tidak sama");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResult("err");
      setErrorMsg(body.error || "Failed to change password");
      return;
    }
    setResult("ok");
    setPw("");
    setPw2("");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">New password</label>
        <Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Confirm password</label>
        <Input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      </div>
      {result === "ok" && (
        <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Password updated</div>
      )}
      {result === "err" && (
        <div className="flex items-start gap-2 text-sm text-red-400"><AlertCircle className="w-4 h-4 mt-0.5" /> {errorMsg}</div>
      )}
      <Button type="submit" disabled={saving || !pw || !pw2}>
        {saving ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
