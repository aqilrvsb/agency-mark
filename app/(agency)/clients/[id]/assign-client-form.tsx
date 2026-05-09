"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X } from "lucide-react";

export function AssignClientForm({ brandId, currentClientEmail }: { brandId: string; currentClientEmail: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tempPassword: string; email: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/agency/client-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: brandId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
      }),
    });
    setLoading(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to create client user");
      return;
    }
    setSuccess({ tempPassword: body.temp_password, email: email.trim() });
    setEmail("");
    setFullName("");
    router.refresh();
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-emerald-300">Client portal user created</h4>
          <button onClick={() => { setSuccess(null); setOpen(false); }} className="text-emerald-300/70 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm">Send these credentials to <strong>{success.email}</strong>:</p>
        <div className="p-2 rounded-lg bg-[var(--color-bg)] font-mono text-xs">
          <div>Email: {success.email}</div>
          <div>Temp password: <strong>{success.tempPassword}</strong></div>
          <div className="mt-1 text-[var(--color-text-muted)]">Login at: /login</div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          They'll see only this brand's data. Tell them to change password after first login.
        </p>
      </div>
    );
  }

  if (!open) {
    if (currentClientEmail) {
      return (
        <div className="text-sm text-[var(--color-text-secondary)]">
          Assigned: <code className="text-xs">{currentClientEmail}</code>
        </div>
      );
    }
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        <UserPlus className="w-4 h-4" /> Create client portal user
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">Create client portal user</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Full name</label>
        <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Client contact name" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Email</label>
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@brand.com" />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          They&apos;ll see only this brand&apos;s campaigns + analytics in their client portal.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !email.trim() || !fullName.trim()} size="sm">
          {loading ? "Creating..." : "Create user"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="secondary" size="sm">Cancel</Button>
      </div>
    </form>
  );
}
