import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";
import { PasswordChangeForm } from "./password-form";
import { User, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientSettingsPage() {
  const user = await requireClient();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Settings</h1>
        <p className="text-[var(--color-text-secondary)]">Your account.</p>
      </header>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle>
          <CardDescription>Account details. Contact your agency to change name or email.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <Row label="Name" value={user.full_name} />
          <Row label="Email" value={<span className="font-mono text-xs">{user.email}</span>} />
          <Row label="Role" value={
            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-xs font-bold uppercase">Client</span>
          } />
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Change password</CardTitle>
          <CardDescription>If your agency gave you a temporary password, change it now.</CardDescription>
        </CardHeader>
        <PasswordChangeForm />
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
