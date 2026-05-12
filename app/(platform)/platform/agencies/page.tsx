import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";

export default async function AgenciesPage() {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select(`
      id, name, prefix, is_active, created_at,
      users:users(count),
      brands:brands(count),
      adzviser_connections:adzviser_connections(workspace_id, last_synced_at, is_active)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-extrabold text-4xl mb-2">Agencies</h1>
          <p className="text-[var(--color-text-secondary)]">All agencies registered on PeningAds.</p>
        </div>
        <Link
          href="/platform/agencies/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition"
        >
          <Plus className="w-4 h-4" /> Add agency
        </Link>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Agency</TableHeader>
              <TableHeader>Staff</TableHeader>
              <TableHeader>Clients</TableHeader>
              <TableHeader>Adzviser</TableHeader>
              <TableHeader>Last sync</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(companies ?? []).map((c) => {
              const conn = (c.adzviser_connections as { workspace_id?: string; last_synced_at?: string; is_active?: boolean }[] | null)?.[0];
              const lastSync = conn?.last_synced_at;
              return (
                <TableRow key={c.id as string}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <div className="font-bold">{c.name as string}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{c.prefix as string}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{(c.users as { count: number }[] | null)?.[0]?.count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{(c.brands as { count: number }[] | null)?.[0]?.count ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    {conn?.workspace_id ? (
                      <span className="text-xs font-mono px-2 py-1 rounded bg-emerald-500/15 text-emerald-400">{conn.workspace_id}</span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">Not configured</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lastSync ? (
                      <span className="text-xs text-[var(--color-text-secondary)]">{new Date(lastSync).toLocaleDateString("en-MY")}</span>
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
                    <Link href={`/platform/agencies/${c.id}`} className="text-xs text-[var(--color-orange)] hover:underline font-bold">
                      Manage →
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {(companies ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[var(--color-text-muted)]">
                  No agencies yet. Click <strong>Add agency</strong> to onboard the first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
