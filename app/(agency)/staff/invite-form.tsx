"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Mail } from "lucide-react";

export function InviteStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"leader" | "marketer">("marketer");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tempPassword: string; email: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/agency/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role,
        whatsapp_number: whatsapp.trim() || null,
      }),
    });
    setLoading(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to invite staff");
      return;
    }
    setSuccess({ tempPassword: body.temp_password, email: email.trim() });
    setEmail("");
    setFullName("");
    setWhatsapp("");
    router.refresh();
  }

  if (!open && !success) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Invite staff
      </Button>
    );
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 max-w-lg">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-emerald-300">Staff invited</h4>
          <button onClick={() => { setSuccess(null); setOpen(false); }} className="text-emerald-300/70 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm">
          Send <strong>{success.email}</strong> these credentials to log in:
        </p>
        <div className="p-2 rounded-lg bg-[var(--color-bg)] font-mono text-xs">
          <div>Email: {success.email}</div>
          <div>Temp password: <strong>{success.tempPassword}</strong></div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          They should change this password after first login.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] max-w-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Invite staff member</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Full name</label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Sarah M." />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "leader" | "marketer")}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
          >
            <option value="marketer">Marketer</option>
            <option value="leader">Leader</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Email</label>
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@agency.com" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">WhatsApp (optional)</label>
        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+60123456789" />
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !email.trim() || !fullName.trim()}>
          {loading ? "Inviting..." : "Send invite"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
