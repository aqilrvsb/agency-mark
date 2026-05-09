import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardHeader } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { Wallet } from "lucide-react";

export default async function ClientBudgetPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands").select("id, name").eq("assigned_client_user_id", user.id).maybeSingle();
  if (!brand) return <div className="p-8">No brand assigned.</div>;

  const [{ data: budget }, { data: topups }] = await Promise.all([
    supabase.from("client_budgets").select("*").eq("brand_id", brand.id).maybeSingle(),
    supabase.from("budget_topups").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Budget</h1>
        <p className="text-[var(--color-text-secondary)]">{brand.name as string}</p>
      </header>

      <Card className="mb-6 !p-8 text-center" style={{ background: "linear-gradient(135deg, rgba(200,245,62,0.08) 0%, rgba(200,245,62,0.02) 100%)", borderColor: "rgba(200,245,62,0.3)" }}>
        <Wallet className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--color-lime)" }} />
        <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2">Current balance</div>
        <div className="font-display font-extrabold text-6xl mb-3" style={{ color: "var(--color-lime)" }}>
          RM {Number(budget?.current_balance_myr ?? 0).toLocaleString()}
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Total topup: <strong>RM {Number(budget?.total_topup_myr ?? 0).toLocaleString()}</strong> ·
          Spent: <strong>RM {Number(budget?.total_spent_myr ?? 0).toLocaleString()}</strong>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topup history</CardTitle>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Date</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Method</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(topups ?? []).map((t) => (
              <TableRow key={t.id as string}>
                <TableCell className="text-xs">{new Date(t.created_at as string).toLocaleDateString("en-MY")}</TableCell>
                <TableCell className="font-mono font-bold">RM {Number(t.amount_myr).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{(t.payment_method as string) || "—"}</TableCell>
                <TableCell className="text-xs font-mono">{(t.reference as string) || "—"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === "success" ? "bg-emerald-500/15 text-emerald-400" : t.status === "failed" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {t.status as string}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {(topups ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[var(--color-text-muted)]">
                  Tiada topup lagi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
