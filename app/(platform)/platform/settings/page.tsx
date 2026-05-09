import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";

export default function PlatformSettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Settings</h1>
        <p className="text-[var(--color-text-secondary)]">Platform-wide configuration.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>Current backend infrastructure.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <Row label="Adzviser plan" value="Starter (3 sources × unlimited accounts)" />
          <Row label="Cron schedule" value="Hourly (0 * * * *)" />
          <Row label="BigQuery project" value={process.env.GCP_PROJECT_ID ?? "Not set"} />
          <Row label="Supabase URL" value={process.env.NEXT_PUBLIC_SUPABASE_URL ?? "Not set"} />
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
    </div>
  );
}
