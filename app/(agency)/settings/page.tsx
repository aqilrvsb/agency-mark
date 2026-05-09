import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";

export default async function AgencySettingsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.company_id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("agency_subscriptions")
    .select("*")
    .eq("company_id", user.company_id)
    .eq("status", "active")
    .maybeSingle();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Settings</h1>
        <p className="text-[var(--color-text-secondary)]">Your agency configuration.</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Agency profile</CardTitle>
          <CardDescription>Basic info about your agency.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <Row label="Agency name" value={(company?.name as string) || "—"} />
          <Row label="Prefix" value={(company?.prefix as string) || "—"} />
          <Row label="Created" value={company?.created_at ? new Date(company.created_at as string).toLocaleDateString("en-MY") : "—"} />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your AdSolution plan.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <Row label="Plan" value={(subscription?.plan as string) || "Trial"} />
          <Row label="Status" value={(subscription?.status as string) || "—"} />
          <Row label="Monthly price" value={subscription ? `RM ${Number(subscription.monthly_price_myr).toLocaleString()}` : "—"} />
          <Row label="Next renewal" value={subscription?.current_period_end ? new Date(subscription.current_period_end as string).toLocaleDateString("en-MY") : "—"} />
          {subscription?.trial_ends_at && (
            <Row label="Trial ends" value={new Date(subscription.trial_ends_at as string).toLocaleDateString("en-MY")} />
          )}
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
