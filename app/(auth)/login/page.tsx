"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "account_deactivated"
      ? "Akaun anda telah dinyahaktifkan."
      : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Look up role to redirect to right portal
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Gagal mendapatkan sesi user.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const dest =
      profile?.role === "platform_admin" ? "/platform" :
      profile?.role === "client" ? "/client/overview" :
      "/dashboard";
    router.replace(dest);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
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
          <h1 className="font-display font-extrabold text-3xl mb-2">Masuk semula</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-7">
            Masukkan email dan password untuk akses dashboard.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Password</label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <Link href="/forgot-password" className="block text-right text-xs text-[var(--color-orange)] hover:underline mt-1.5">
                Lupa password?
              </Link>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Sedang masuk..." : (
                <>Masuk <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-secondary)]">
            Belum ada akaun? {" "}
            <Link href="/register" className="text-[var(--color-orange)] hover:underline font-bold">
              Daftar agensi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
