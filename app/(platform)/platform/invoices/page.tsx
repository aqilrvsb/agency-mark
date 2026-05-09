import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

export default async function PlatformInvoicesPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, companies:companies(name)")
    .order("issued_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Invoices</h1>
        <p className="text-[var(--color-text-secondary)]">All invoices across agencies (master view).</p>
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Invoice #</TableHeader>
              <TableHeader>Agency</TableHeader>
              <TableHeader>Amount (MYR)</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Issued</TableHeader>
              <TableHeader>Due</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoices ?? []).map((inv) => {
              const company = inv.companies as { name: string } | null;
              const statusColor = inv.status === "paid" ? "emerald" : inv.status === "overdue" ? "red" : "amber";
              return (
                <TableRow key={inv.id as string}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number as string}</TableCell>
                  <TableCell className="font-bold">{company?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono">RM {Number(inv.amount_myr).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase bg-${statusColor}-500/15 text-${statusColor}-400`}>
                      {inv.status as string}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(inv.issued_at as string).toLocaleDateString("en-MY")}</TableCell>
                  <TableCell className="text-xs">
                    {inv.due_date ? new Date(inv.due_date as string).toLocaleDateString("en-MY") : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {(invoices ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[var(--color-text-muted)]">
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
