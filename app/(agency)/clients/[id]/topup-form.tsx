"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export function TopupForm({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/agency/budget-topups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: brandId,
        amount_myr: amt,
        payment_method: paymentMethod,
        reference: reference.trim() || null,
      }),
    });
    setLoading(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to record topup");
      return;
    }
    setAmount("");
    setReference("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <Plus className="w-4 h-4" /> Top up budget
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">Record budget top-up</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Amount (MYR)</label>
        <Input
          required
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000.00"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Payment method</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm"
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="duitnow">DuitNow</option>
          <option value="fpx">FPX</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Reference (optional)</label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank ref / receipt no." />
      </div>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !amount} size="sm">
          {loading ? "Recording..." : "Record top-up"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="outline" size="sm">Cancel</Button>
      </div>
    </form>
  );
}
