import { createClient } from "@/lib/supabase/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Activity, User, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await requireAgencyLeadership();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, user_id")
    .eq("company_id", user.company_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean) as string[])];
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Activity Logs</h1>
        <p className="text-[var(--color-text-secondary)]">Audit trail of who did what across your agency.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Last 100 events</CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        <div className="divide-y divide-[var(--color-border)]">
          {(logs ?? []).length === 0 && (
            <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
              No activity yet. Events will appear here as your team uses the platform.
            </div>
          )}
          {(logs ?? []).map((l) => {
            const u = l.user_id ? userMap.get(l.user_id as string) : null;
            return (
              <div key={l.id as string} className="py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{u?.full_name ?? "System"}</span>
                    <span className="text-sm text-[var(--color-text-secondary)]">{l.action as string}</span>
                    {l.entity_type && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
                        {l.entity_type as string}
                      </span>
                    )}
                  </div>
                  {u?.email && (
                    <div className="text-xs text-[var(--color-text-muted)]">{u.email as string}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(l.created_at as string).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
