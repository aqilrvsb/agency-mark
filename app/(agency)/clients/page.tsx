import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";

export default async function ClientsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from("brands")
    .select(`
      id, name, is_active, created_at,
      brand_ad_accounts:brand_ad_accounts(platform, external_account_id),
      client_budgets:client_budgets(current_balance_myr)
    `)
    .eq("company_id", user.company_id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-extrabold text-4xl mb-2">Clients</h1>
          <p className="text-[var(--color-text-secondary)]">All brands managed by your agency.</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition"
        >
          <Plus className="w-4 h-4" /> Add client
        </Link>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Brand</TableHeader>
              <TableHeader>Platforms</TableHeader>
              <TableHeader>Ad accounts</TableHeader>
              <TableHeader>Budget balance</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(brands ?? []).map((b) => {
              const accounts = (b.brand_ad_accounts as { platform: string; external_account_id: string }[] | null) ?? [];
              const platforms = [...new Set(accounts.map(a => a.platform))];
              const budget = (b.client_budgets as { current_balance_myr: number }[] | null)?.[0]?.current_balance_myr ?? 0;
              return (
                <TableRow key={b.id as string}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-black" />
                      </div>
                      <div className="font-bold">{b.name as string}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {platforms.includes("meta") && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300">FB</span>}
                      {platforms.includes("tiktok") && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/15 text-pink-300">TT</span>}
                      {platforms.length === 0 && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono">{accounts.length}</span></TableCell>
                  <TableCell><span className="font-mono">RM {Number(budget).toLocaleString()}</span></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${b.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/clients/${b.id}`} className="text-xs text-[var(--color-orange)] hover:underline font-bold">
                      Open →
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {(brands ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--color-text-muted)]">
                  No clients yet. Click <strong>Add client</strong> to create your first brand.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
