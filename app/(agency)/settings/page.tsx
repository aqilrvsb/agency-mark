import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { AgencyProfileForm } from "./agency-profile-form";
import { Building2, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgencySettingsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const [{ data: company }, { data: subscription }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", user.company_id).maybeSingle(),
    supabase.from("agency_subscriptions").select("*").eq("company_id", user.company_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const canEdit = user.role === "bod" || user.role === "platform_admin";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Settings</h1>
        <p className="text-[var(--color-text-secondary)]">Your agency configuration.</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Agency profile</CardTitle>
          <CardDescription>Name and branding shown to your clients.</CardDescription>
        </CardHeader>
        <AgencyProfileForm
          initial={{
            id: company?.id as string,
            name: (company?.name as string) ?? "",
            logo_url: (company?.logo_url as string | null) ?? null,
          }}
          canEdit={canEdit}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Subscription</CardTitle>
          <CardDescription>Your AdSolution plan.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <Row label="Plan" value={(subscription?.plan as string) ?? "—"} />
          <Row label="Status" value={
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${
              subscription?.status === "active" ? "bg-emerald-500/15 text-emerald-300"
              : subscription?.status === "trial" ? "bg-amber-500/15 text-amber-300"
              : subscription?.status === "past_due" ? "bg-red-500/15 text-red-300"
              : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]"
            }`}>
              {(subscription?.status as string) ?? "—"}
            </span>
          } />
          <Row label="Monthly price" value={subscription ? `RM ${Number(subscription.monthly_price_myr).toLocaleString()}` : "—"} />
          {subscription?.trial_ends_at && (
            <Row label="Trial ends" value={new Date(subscription.trial_ends_at as string).toLocaleDateString("en-MY")} />
          )}
          {subscription?.current_period_end && (
            <Row label="Next renewal" value={new Date(subscription.current_period_end as string).toLocaleDateString("en-MY")} />
          )}
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
