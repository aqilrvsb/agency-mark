import { createClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientNotificationsPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-2">Notifications</h1>
        <p className="text-[var(--color-text-secondary)]">
          {unread > 0 ? `${unread} unread` : "All caught up."}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Inbox</CardTitle>
          <CardDescription>Updates from your agency about your campaigns.</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {(notifications ?? []).length === 0 && (
            <div className="text-sm text-[var(--color-text-muted)] py-6 text-center">No notifications yet.</div>
          )}
          {(notifications ?? []).map((n) => (
            <div
              key={n.id as string}
              className={`p-3 rounded-xl border ${n.is_read ? "border-[var(--color-border)]" : "border-[var(--color-orange)]/40 bg-[var(--color-orange)]/5"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-orange)]" />}
                <h4 className="font-bold text-sm">{n.title as string}</h4>
              </div>
              {n.message && (
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">{n.message as string}</p>
              )}
              <div className="text-[10px] text-[var(--color-text-muted)]">
                {new Date(n.created_at as string).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
