"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/agency/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact_email: contactEmail, contact_phone: contactPhone }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      setLoading(false);
      return;
    }
    router.push(`/clients/${json.brand_id}`);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add new client</CardTitle>
          <CardDescription>Create a new brand. Connect ad accounts after creation.</CardDescription>
        </CardHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Brand name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC Skincare Sdn Bhd" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Contact email</label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@abcskincare.my" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Contact phone</label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+60..." />
          </div>

          <Button type="submit" disabled={loading} size="lg">
            {loading ? "Creating..." : "Create brand"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
