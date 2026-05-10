"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register-marketer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, whatsapp }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Pendaftaran gagal.");
      setLoading(false);
      return;
    }

    // Auto sign in after successful register
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    router.replace("/marketer/templates");
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
        <div className="bg-sky" />
        <div className="bg-grid" />
        <div className="relative max-w-md text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="font-display font-extrabold text-3xl mb-3">Pendaftaran berjaya!</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">Sila sign in untuk continue.</p>
          <Link href="/login">
            <Button>
              Pergi ke login <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="bg-sky" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight">AdSolution</span>
        </Link>

        <div className="card">
          <h1 className="font-display font-extrabold text-3xl mb-2">Mula percuma</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-7">
            Sambung Facebook, TikTok &amp; Google Ads anda. Custom report templates dengan formula sendiri. Free 14 hari.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Nama anda
              </label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama penuh"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Password (min 8 chars)
              </label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                WhatsApp (optional)
              </label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+60..." />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? (
                "Sedang daftar..."
              ) : (
                <>
                  Daftar &amp; mula <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
            Dah ada akaun?{" "}
            <Link href="/login" className="text-[var(--color-orange)] hover:underline font-bold">
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
