import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MarkReadButton } from "./mark-read-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireAgencyStaff();
  const supabase = await createClient();

  const [{ data: notifications }, { data: alerts }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("alert_history")
      .select("id, severity, metric, message, campaign_name, current_value, threshold_value, is_read, created_at")
      .eq("company_id", user.company_id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const unreadNotifs = (notifications ?? []).filter((n) => !n.is_read).length;
  const unreadAlerts = (alerts ?? []).filter((a) => !a.is_read).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display font-extrabold text-4xl mb-2">Notifications</h1>
        <p className="text-[var(--color-text-secondary)]">
          {unreadNotifs + unreadAlerts > 0
            ? `${unreadNotifs + unreadAlerts} unread • ${unreadNotifs} notifications, ${unreadAlerts} alerts`
            : "All caught up."}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications {unreadNotifs > 0 && <span className="ml-2 text-xs bg-[var(--color-orange)] text-black rounded-full px-2 py-0.5">{unreadNotifs}</span>}</CardTitle>
            <CardDescription>Personal notifications for you.</CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {(notifications ?? []).length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)] py-6 text-center">No notifications yet.</div>
            )}
            {(notifications ?? []).map((n) => (
              <div
                key={n.id as string}
                className={`p-3 rounded-xl border ${n.is_read ? "border-[var(--color-border)] bg-transparent" : "border-[var(--color-orange)]/40 bg-[var(--color-orange)]/5"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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
                  {!n.is_read && <MarkReadButton id={n.id as string} kind="notification" />}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Performance Alerts {unreadAlerts > 0 && <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{unreadAlerts}</span>}</CardTitle>
            <CardDescription>Auto-generated when KPIs cross thresholds.</CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {(alerts ?? []).length === 0 && (
              <div className="text-sm text-[var(--color-text-muted)] py-6 text-center">No alerts yet. Configure alert rules to get notified.</div>
            )}
            {(alerts ?? []).map((a) => {
              const sevColor = a.severity === "critical" ? "bg-red-500/15 text-red-300 border-red-500/30"
                : a.severity === "warning" ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-blue-500/15 text-blue-300 border-blue-500/30";
              return (
                <div
                  key={a.id as string}
                  className={`p-3 rounded-xl border ${a.is_read ? "border-[var(--color-border)] bg-transparent" : sevColor}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${sevColor}`}>{a.severity as string}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{a.metric as string}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{a.message as string}</p>
                      {a.campaign_name && (
                        <div className="text-[10px] text-[var(--color-text-muted)]">Campaign: {a.campaign_name as string}</div>
                      )}
                      <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        {new Date(a.created_at as string).toLocaleString()}
                      </div>
                    </div>
                    {!a.is_read && <CheckCircle2 className="w-4 h-4 text-[var(--color-text-muted)]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
