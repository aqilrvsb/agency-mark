import { createClient } from "@/lib/supabase/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

export default async function AgencyInvoicesPage() {
  const user = await requireAgencyLeadership();
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("company_id", user.company_id)
    .order("issued_at", { ascending: false });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Invoices</h1>
        <p className="text-[var(--color-text-secondary)]">Your AdSolution subscription invoices.</p>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Number</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Issued</TableHeader>
              <TableHeader>Paid</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoices ?? []).map((inv) => (
              <TableRow key={inv.id as string}>
                <TableCell className="font-mono text-xs">{inv.invoice_number as string}</TableCell>
                <TableCell className="font-mono font-bold">RM {Number(inv.amount_myr).toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : inv.status === "overdue" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {inv.status as string}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{new Date(inv.issued_at as string).toLocaleDateString("en-MY")}</TableCell>
                <TableCell className="text-xs">{inv.paid_at ? new Date(inv.paid_at as string).toLocaleDateString("en-MY") : "—"}</TableCell>
              </TableRow>
            ))}
            {(invoices ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[var(--color-text-muted)]">
                  No invoices yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
