import { requireMarketer } from "@/lib/auth/guards";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  LayoutTemplate,
  Plug,
  Settings,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileSidebarToggle } from "@/components/client/mobile-sidebar";

/**
 * Marketer route group — sibling of (client) for now. Eventually we'll
 * fold (client) into here so all paths live at /marketer/*.
 */
export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMarketer();

  return (
    <div className="min-h-screen md:flex">
      <MobileSidebarToggle>
        <div className="p-6 border-b border-[var(--color-border)]">
          <Link href="/client/overview" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-extrabold text-lg leading-none">PeningAds</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-orange)] mt-0.5">
                Marketer
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <NavItem href="/client/overview" icon={LayoutDashboard}>
                Overview
              </NavItem>
            </li>
            <li>
              <NavItem href="/marketer/templates" icon={LayoutTemplate}>
                Templates
              </NavItem>
            </li>
            <li>
              <NavItem href="/client/connections" icon={Plug}>
                Connect Ads
              </NavItem>
            </li>
            <li>
              <NavItem href="/client/settings" icon={Settings}>
                Settings
              </NavItem>
            </li>
          </ul>
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-[var(--color-text-muted)]">Signed in as</div>
            <div className="text-sm font-bold truncate">{user.full_name}</div>
            <div className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </MobileSidebarToggle>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
}) {
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
