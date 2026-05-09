"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="bg-sky" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <div className="relative w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6">
          <ArrowLeft className="w-4 h-4" /> Kembali ke login
        </Link>

        <div className="card">
          <Link href="/" className="flex items-center gap-2.5 mb-7">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-display font-extrabold text-xl">AdSolution</span>
          </Link>

          <h1 className="font-display font-extrabold text-3xl mb-2">Lupa password?</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Masukkan email — kami akan hantar link reset.
          </p>

          {sent ? (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold mb-1">Email dah dihantar!</div>
                Check inbox (atau spam folder) untuk link reset password.
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}
              <form onSubmit={onSubmit} className="space-y-4">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@agency.com" />
                <Button type="submit" disabled={loading} size="lg" className="w-full">
                  {loading ? "Sedang hantar..." : "Hantar link reset"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
