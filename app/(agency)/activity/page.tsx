import { createClient } from "@/lib/supabase/server";
import { requireAgencyLeadership } from "@/lib/auth/guards";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Pin,
  Wallet,
  Plug,
  StickyNote,
  Target,
  UserPlus,
  Building2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ActionMeta {
  icon: typeof Activity;
  iconBg: string;
  iconColor: string;
  verb: (metadata: Record<string, unknown> | null, brandName?: string) => React.ReactNode;
}

const ACTION_META: Record<string, ActionMeta> = {
  "budget.topup": {
    icon: Wallet,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-300",
    verb: (m, brand) => (
      <>
        topped up <span className="font-mono">RM {Number(m?.amount_myr ?? 0).toLocaleString()}</span>
        {brand && <> for <span className="font-bold">{brand}</span></>}
        {m?.payment_method ? <> via {String(m.payment_method)}</> : null}
      </>
    ),
  },
  "ad_account.added": {
    icon: Plug,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-300",
    verb: (m, brand) => (
      <>
        connected <span className="font-bold">{String(m?.platform ?? "ad account")}</span>
        {brand && <> for <span className="font-bold">{brand}</span></>}
        {m?.external_account_id ? <> (<code className="text-xs">{String(m.external_account_id)}</code>)</> : null}
      </>
    ),
  },
  "ad_account.removed": {
    icon: Plug,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-300",
    verb: () => <>removed an ad account</>,
  },
  "note.added": {
    icon: StickyNote,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-300",
    verb: (m, brand) => (
      <>
        added a note
        {brand && <> on <span className="font-bold">{brand}</span></>}
        {m?.excerpt ? <span className="text-[var(--color-text-muted)]"> — &ldquo;{String(m.excerpt)}&rdquo;</span> : null}
      </>
    ),
  },
  "annotation.added": {
    icon: Pin,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-300",
    verb: (m, brand) => (
      <>
        pinned an annotation on <span className="font-mono">{String(m?.anchor_date ?? "")}</span>
        {brand && <> for <span className="font-bold">{brand}</span></>}
        {m?.excerpt ? <span className="text-[var(--color-text-muted)]"> — &ldquo;{String(m.excerpt)}&rdquo;</span> : null}
      </>
    ),
  },
  "goal.set": {
    icon: Target,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-300",
    verb: (m, brand) => (
      <>
        set a <span className="font-bold">{String(m?.metric ?? "metric")}</span> target of{" "}
        <span className="font-mono">{Number(m?.target_value ?? 0).toLocaleString()}</span>
        {brand && <> for <span className="font-bold">{brand}</span></>}
      </>
    ),
  },
  "client_user.created": {
    icon: UserPlus,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-300",
    verb: (m) => (
      <>
        created client login {m?.email ? <code className="text-xs">{String(m.email)}</code> : null}
      </>
    ),
  },
};

const FALLBACK: ActionMeta = {
  icon: Activity,
  iconBg: "bg-white/5",
  iconColor: "text-[var(--color-text-muted)]",
  verb: (m) => <>{m?.summary ? String(m.summary) : "did something"}</>,
};

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
  const brandIds = [
    ...new Set(
      (logs ?? [])
        .filter((l) => l.entity_type === "brand" && l.entity_id)
        .map((l) => l.entity_id as string)
    ),
  ];
  // brands referenced via metadata.brand_id too (e.g. ad_account.added)
  for (const l of logs ?? []) {
    const m = l.metadata as Record<string, unknown> | null;
    if (m?.brand_id && typeof m.brand_id === "string") brandIds.push(m.brand_id);
  }

  const [{ data: users }, { data: brands }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("users").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    brandIds.length > 0
      ? supabase.from("brands").select("id, name").in("id", [...new Set(brandIds)])
      : Promise.resolve({ data: [] }),
  ]);
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
  const brandMap = new Map((brands ?? []).map((b) => [b.id as string, b.name as string]));

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-2">Activity</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Audit trail of who did what across your agency. Last 100 events.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" /> Recent activity
          </CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        {(logs ?? []).length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
            <div className="text-sm font-bold mb-1">No activity yet</div>
            <div className="text-xs text-[var(--color-text-muted)] mb-4">
              Events will appear here as your team tops up budgets, adds notes, sets goals, or
              connects ad accounts.
            </div>
            <Link
              href="/clients"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a]"
            >
              <Building2 className="w-4 h-4" /> Manage clients
            </Link>
          </div>
        ) : (
          <ol className="relative border-l border-[var(--color-border)] ml-3 space-y-4">
            {(logs ?? []).map((l) => {
              const u = l.user_id ? userMap.get(l.user_id as string) : null;
              const meta = ACTION_META[l.action as string] ?? FALLBACK;
              const Icon = meta.icon;
              const md = (l.metadata as Record<string, unknown> | null) ?? null;
              const brandIdFromEntity = l.entity_type === "brand" ? (l.entity_id as string | null) : null;
              const brandIdFromMeta = md?.brand_id && typeof md.brand_id === "string" ? md.brand_id : null;
              const brandId = brandIdFromEntity ?? brandIdFromMeta;
              const brandName = brandId ? brandMap.get(brandId) : undefined;

              return (
                <li key={l.id as string} className="ml-6">
                  <span
                    className={`absolute -left-[13px] flex w-6 h-6 rounded-full items-center justify-center ${meta.iconBg}`}
                  >
                    <Icon className={`w-3 h-3 ${meta.iconColor}`} />
                  </span>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="text-sm leading-snug">
                      <span className="font-bold">{u?.full_name ?? "System"}</span>{" "}
                      <span className="text-[var(--color-text-secondary)]">
                        {meta.verb(md, brandName)}
                      </span>
                      {brandId && brandName && (
                        <Link
                          href={`/clients/${brandId}`}
                          className="ml-1 text-xs text-[var(--color-orange)] hover:underline"
                        >
                          (open)
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] flex-shrink-0 font-mono whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(l.created_at as string).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
