import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Key, ExternalLink } from "lucide-react";

export default async function AdzviserKeysPage() {
  const supabase = await createClient();

  const { data: connections } = await supabase
    .from("adzviser_connections")
    .select(`
      id, company_id, workspace_id, notes, is_active, last_synced_at, updated_at,
      companies:companies(name, prefix)
    `)
    .order("updated_at", { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Adzviser Keys</h1>
        <p className="text-[var(--color-text-secondary)]">All Adzviser API keys + BigQuery workspace mappings.</p>
      </header>

      <Card className="!p-5 mb-6 border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-yellow-300">⚠️ Master admin only</CardTitle>
          <CardDescription>
            These keys are NEVER shown to agencies or clients. Adzviser is your private backend infrastructure.
            Each agency gets one workspace; ad accounts live within workspaces.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Agency</TableHeader>
              <TableHeader>BigQuery dataset</TableHeader>
              <TableHeader>Notes</TableHeader>
              <TableHeader>Last sync</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(connections ?? []).map((c) => {
              const companiesData = c.companies as unknown as { name: string; prefix: string }[] | { name: string; prefix: string } | null;
              const company = Array.isArray(companiesData) ? companiesData[0] ?? null : companiesData;
              return (
                <TableRow key={c.id as string}>
                  <TableCell>
                    <div className="font-bold">{company?.name ?? "—"}</div>
                    <div className="text-xs text-[var(--color-text-muted)] font-mono">{company?.prefix ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs px-2 py-1 rounded bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                      {(c.workspace_id as string) || "—"}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-[var(--color-text-secondary)]">
                    {(c.notes as string) || "—"}
                  </TableCell>
                  <TableCell>
                    {c.last_synced_at ? (
                      <span className="text-xs">{new Date(c.last_synced_at as string).toLocaleString("en-MY")}</span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${c.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/platform/agencies/${c.company_id}`} className="text-xs text-[var(--color-orange)] hover:underline font-bold inline-flex items-center gap-1">
                      Edit <ExternalLink className="w-3 h-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {(connections ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--color-text-muted)]">
                  No Adzviser keys configured yet. Add an agency first, then configure their key from the agency detail page.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="mt-6 !p-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Setup runbook</CardTitle>
          <CardDescription>How to onboard a new agency&apos;s Adzviser pipeline.</CardDescription>
        </CardHeader>
        <ol className="space-y-2 text-sm text-[var(--color-text-secondary)] list-decimal pl-5">
          <li>Log into your Adzviser account at <a href="https://adzviser.com/set-up" target="_blank" rel="noreferrer" className="text-[var(--color-orange)] hover:underline">adzviser.com/set-up</a></li>
          <li>Create a new <strong>Workspace</strong> named after the agency (e.g., &ldquo;Agency ABC&rdquo;)</li>
          <li>Connect <strong>3 sources</strong>: Facebook Ads, Facebook Insights, TikTok Ads</li>
          <li>Add ALL ad accounts the agency manages into that workspace</li>
          <li>Go to <strong>BigQuery destination</strong> → Create New Pipeline</li>
          <li>Use service account JSON from your GCP project (must have BigQuery Data Editor + Job User)</li>
          <li>Schedule daily export at 03:00 (Yesterday&apos;s data)</li>
          <li>Note the BigQuery dataset name → save in the agency&apos;s &ldquo;BigQuery dataset&rdquo; field here</li>
          <li>Map ad account IDs to agency&apos;s brands in <code className="text-xs">brand_ad_accounts</code> table</li>
          <li>Click <strong>Sync now</strong> to verify data flows in</li>
        </ol>
      </Card>
    </div>
  );
}
