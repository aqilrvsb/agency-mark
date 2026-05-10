import { requireAgencyStaff } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users, Megaphone, BarChart3, CreditCard, AlertTriangle } from "lucide-react";
import { loadDashboardData } from "@/lib/agency-data/dashboard-data";
import { AgencyHeroStrip } from "@/components/agency/agency-hero-strip";
import { ClientTile } from "@/components/agency/client-tile";
import { ClientSearch } from "@/components/agency/client-search";

export const dynamic = "force-dynamic";

const fmtMyr = (n: number) =>
  `RM ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => n.toLocaleString();

export default async function DashboardOverviewPage() {
  const user = await requireAgencyStaff();
  if (!user.company_id) {
    return (
      <div className="p-8">
        <p>No company assigned. Contact platform admin.</p>
      </div>
    );
  }

  const data = await loadDashboardData({ companyId: user.company_id });

  // First-run: BOD/Leader with zero brands sees onboarding instead.
  if (
    data.totals.totalBrands === 0 &&
    (user.role === "bod" || user.role === "leader")
  ) {
    redirect("/welcome");
  }

  const heroTiles = [
    {
      label: "Spend (7d)",
      value: fmtMyr(data.totals.spend),
      delta: data.totals.spendDelta,
      positiveIsGood: false,
      accent: "text-[var(--color-orange)]",
    },
    {
      label: "Revenue (7d)",
      value: fmtMyr(data.totals.revenue),
      delta: data.totals.revenueDelta,
      positiveIsGood: true,
      accent: "text-emerald-400",
    },
    {
      label: "Blended ROAS",
      value: data.totals.roas > 0 ? `${data.totals.roas.toFixed(2)}×` : "—",
      delta: data.totals.roasDelta,
      positiveIsGood: true,
      accent: "text-[var(--color-amber)]",
    },
    {
      label: "Conversions",
      value: fmtInt(data.totals.conversions),
      delta: data.totals.conversionsDelta,
      positiveIsGood: true,
      accent: "text-[var(--color-lime)]",
    },
  ];

  const alertCount = data.brands.filter((b) => b.status === "alert").length;
  const warnCount = data.brands.filter((b) => b.status === "warn").length;
  const healthyCount = data.brands.filter((b) => b.status === "healthy").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-1">
            Welcome back, {user.full_name.split(" ")[0]}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {data.totals.activeBrands} of {data.totals.totalBrands} brands active · {data.range.start} → {data.range.end}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClientSearch />
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add client
          </Link>
        </div>
      </header>

      {(data.unreadAlerts > 0 || data.recentAlerts.length > 0) && (
        <div className="rounded-2xl mb-6 border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <div className="flex-1">
              <div className="font-bold text-amber-300">
                {data.unreadAlerts > 0
                  ? `${data.unreadAlerts} unread alert${data.unreadAlerts === 1 ? "" : "s"}`
                  : "Recent alerts"}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                Anomalies detected by the nightly scan (1 AM UTC).
              </div>
            </div>
            <Link href="/notifications" className="text-amber-300 text-sm font-bold whitespace-nowrap">
              View all →
            </Link>
          </div>
          <ul className="space-y-1">
            {data.recentAlerts.slice(0, 3).map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 text-xs py-2 border-t border-amber-500/10 first:border-0 first:pt-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[var(--color-text-primary)]">
                    {a.brandName}
                    <span
                      className={`ml-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                        a.severity === "critical"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-secondary)] mt-0.5">{a.message}</div>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap mt-0.5 font-mono">
                  {new Date(a.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AgencyHeroStrip tiles={heroTiles} />

      {/* Client tiles grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold mb-0.5">
              Clients
            </div>
            <div className="text-sm font-bold flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> {healthyCount} healthy
              </span>
              {warnCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> {warnCount} watch
                </span>
              )}
              {alertCount > 0 && (
                <span className="flex items-center gap-1 text-red-300">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> {alertCount} alert
                </span>
              )}
            </div>
          </div>
          <Link href="/clients" className="text-xs font-bold text-[var(--color-orange)] hover:underline">
            View all →
          </Link>
        </div>

        {data.brands.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-sm text-[var(--color-text-muted)] mb-3">No clients yet.</div>
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a]"
            >
              <Plus className="w-4 h-4" /> Add your first client
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.brands.slice(0, 12).map((tile) => (
              <ClientTile key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/clients" icon={Users} label="Manage clients" />
        <QuickAction href="/campaigns" icon={Megaphone} label="View campaigns" />
        <QuickAction href="/analytics" icon={BarChart3} label="Open analytics" />
        <QuickAction href="/invoices" icon={CreditCard} label="Invoices" />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)] hover:border-white/10 hover:bg-white/[0.03] transition group"
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[var(--color-orange)]/15 transition">
        <Icon className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-orange)] transition" />
      </div>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
