import { createClient } from "@/lib/supabase/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { InviteStaffForm } from "./invite-form";

export default async function StaffPage() {
  const user = await requireAgencyLeadership();
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active, whatsapp_number")
    .eq("company_id", user.company_id)
    .neq("role", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-4xl mb-2">Staff</h1>
          <p className="text-[var(--color-text-secondary)]">All team members in your agency.</p>
        </div>
        <InviteStaffForm />
      </header>

      <Card className="!p-0 !border-0 !bg-transparent">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>WhatsApp</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(staff ?? []).map((s) => (
              <TableRow key={s.id as string}>
                <TableCell className="font-bold">{s.full_name as string}</TableCell>
                <TableCell className="text-xs text-[var(--color-text-secondary)]">{s.email as string}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-md text-xs font-bold uppercase bg-[var(--color-orange-soft)] text-[var(--color-orange)]">
                    {s.role as string}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{(s.whatsapp_number as string) || "—"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${s.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
