"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NewAgencyPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [bodFullName, setBodFullName] = useState("");
  const [bodEmail, setBodEmail] = useState("");
  const [bodPassword, setBodPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register-agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agencyName,
        fullName: bodFullName,
        email: bodEmail,
        password: bodPassword,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      setLoading(false);
      return;
    }
    router.push(`/platform/agencies/${json.company_id}`);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/platform/agencies" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to agencies
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Onboard a new agency</CardTitle>
          <CardDescription>Create the agency + their first BOD (owner) account.</CardDescription>
        </CardHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Agency name" value={agencyName} onChange={setAgencyName} placeholder="Berani Marketing Sdn Bhd" />
          <Field label="BOD full name" value={bodFullName} onChange={setBodFullName} placeholder="Ahmad bin Ali" />
          <Field label="BOD email" type="email" value={bodEmail} onChange={setBodEmail} placeholder="ahmad@berani.my" />
          <Field label="Initial password (BOD will change)" type="password" value={bodPassword} onChange={setBodPassword} minLength={8} />

          <Button type="submit" disabled={loading} size="lg">
            {loading ? "Creating..." : "Create agency"}
          </Button>
        </form>
      </Card>

      <p className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
        After creating, set up Adzviser config + connect ad accounts on the agency detail page.
      </p>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, minLength }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; minLength?: number }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">{label}</label>
      <Input type={type} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} minLength={minLength} />
    </div>
  );
}
