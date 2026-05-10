import Link from "next/link";
import { LayoutDashboard, Megaphone, StickyNote, Target, Plug, Users, Wallet, Pin } from "lucide-react";

export type HubTab = "dashboard" | "campaigns" | "notes" | "annotations" | "goals" | "connections" | "users" | "budget";

const TABS: { id: HubTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "annotations", label: "Annotations", icon: Pin },
  { id: "goals", label: "Goals", icon: Target },
  { id: "connections", label: "Connections", icon: Plug },
  { id: "users", label: "Users", icon: Users },
  { id: "budget", label: "Budget", icon: Wallet },
];

export function ClientHubTabs({ brandId, active }: { brandId: string; active: HubTab }) {
  return (
    <div className="border-b border-[var(--color-border)] mb-6 sticky top-0 bg-[var(--color-bg)]/95 backdrop-blur-sm z-10 -mx-6 px-6 lg:-mx-8 lg:px-8">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {TABS.map((t) => {
          const isActive = t.id === active;
          const Icon = t.icon;
          const href = t.id === "dashboard" ? `/clients/${brandId}` : `/clients/${brandId}?tab=${t.id}`;
          return (
            <Link
              key={t.id}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition border-b-2 ${
                isActive
                  ? "text-[var(--color-orange)] border-[var(--color-orange)]"
                  : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:border-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function parseHubTab(value: string | undefined | null): HubTab {
  const valid: HubTab[] = ["dashboard", "campaigns", "notes", "annotations", "goals", "connections", "users", "budget"];
  if (value && valid.includes(value as HubTab)) return value as HubTab;
  return "dashboard";
}
