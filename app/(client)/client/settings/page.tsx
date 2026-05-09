import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardHeader, CardDescription } from "@/components/ui/card";

export default async function ClientSettingsPage() {
  const user = await requireClient();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Account ini diuruskan oleh agensi anda. Untuk update, hubungi mereka.</CardDescription>
        </CardHeader>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
            <dt className="text-[var(--color-text-muted)]">Nama</dt>
            <dd className="font-bold">{user.full_name}</dd>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
            <dt className="text-[var(--color-text-muted)]">Email</dt>
            <dd className="font-mono text-xs">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-[var(--color-text-muted)]">Role</dt>
            <dd className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-xs font-bold uppercase">
              Client
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
