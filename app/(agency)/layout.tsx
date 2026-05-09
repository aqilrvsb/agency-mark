import { requireAgencyStaff } from "@/lib/auth/guards";
import Link from "next/link";
import { Sparkles, LayoutDashboard, Users, Megaphone, BarChart3, FileText, UserCog, Settings } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAgencyStaff();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-soft)] flex flex-col">
        <div className="p-6 border-b border-[var(--color-border)]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-extrabold text-lg leading-none">AdSolution</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-orange)] mt-0.5">Agency</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/dashboard" icon={LayoutDashboard}>Overview</NavItem>
          <NavItem href="/clients" icon={Users}>Clients</NavItem>
          <NavItem href="/campaigns" icon={Megaphone}>Campaigns</NavItem>
          <NavItem href="/analytics" icon={BarChart3}>Analytics</NavItem>
          <NavItem href="/invoices" icon={FileText}>Invoices</NavItem>
          {(user.role === "bod" || user.role === "leader" || user.role === "platform_admin") && (
            <NavItem href="/staff" icon={UserCog}>Staff</NavItem>
          )}
          <NavItem href="/settings" icon={Settings}>Settings</NavItem>
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-[var(--color-text-muted)]">Signed in as</div>
            <div className="text-sm font-bold truncate">{user.full_name}</div>
            <div className="text-xs text-[var(--color-text-muted)] truncate capitalize">{user.role}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({ href, icon: Icon, children }: { href: string; icon: typeof LayoutDashboard; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] transition"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
