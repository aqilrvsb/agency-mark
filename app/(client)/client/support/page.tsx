import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { MessageCircle, Phone, Mail, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientSupportPage() {
  const user = await requireClient();
  const supabase = await createClient();

  // Find the agency assigned to this client (via brand)
  const { data: brand } = await supabase
    .from("brands")
    .select("name, contact_email, contact_phone, company_id, companies(name)")
    .eq("assigned_client_user_id", user.id)
    .maybeSingle();

  // Find a BOD/Leader contact in the agency
  const { data: contacts } = brand?.company_id
    ? await supabase
        .from("users")
        .select("full_name, email, whatsapp_number, role")
        .eq("company_id", brand.company_id as string)
        .in("role", ["bod", "leader"])
        .eq("is_active", true)
        .limit(3)
    : { data: [] };

  const agencyName = (brand?.companies as { name: string } | null)?.name ?? "your agency";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-2">Support</h1>
        <p className="text-[var(--color-text-secondary)]">
          Need help? Reach out to {agencyName} directly.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Your agency</CardTitle>
            <CardDescription>Account managed by</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {(contacts ?? []).length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">No agency contacts available yet.</p>
            )}
            {(contacts ?? []).map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm">{c.full_name as string}</div>
                    <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-bold">{c.role as string}</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-orange)]">
                    <Mail className="w-3.5 h-3.5" /> {c.email as string}
                  </a>
                  {c.whatsapp_number && (
                    <a href={`https://wa.me/${(c.whatsapp_number as string).replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-lime)]">
                      <Phone className="w-3.5 h-3.5" /> {c.whatsapp_number as string}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5" /> What can your agency help with?</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>• Campaign performance questions or budget changes</li>
            <li>• Creative or targeting requests</li>
            <li>• Top-up your ad budget</li>
            <li>• Update billing details</li>
            <li>• Pause or restart campaigns</li>
            <li>• Connect new ad accounts (FB, Google, TikTok)</li>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-[var(--color-orange)]/5 border border-[var(--color-orange)]/30">
            <p className="text-xs text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-orange)]">Tip:</strong> WhatsApp is usually fastest.
              For larger requests, email helps your agency keep records.
            </p>
          </div>
        </Card>
      </div>

      {brand && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>What we have on file for you.</CardDescription>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <dt className="text-[var(--color-text-muted)]">Brand</dt>
              <dd className="font-bold">{brand.name as string}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <dt className="text-[var(--color-text-muted)]">Contact email</dt>
              <dd>{(brand.contact_email as string) || "—"}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-[var(--color-text-muted)]">Contact phone</dt>
              <dd>{(brand.contact_phone as string) || "—"}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
