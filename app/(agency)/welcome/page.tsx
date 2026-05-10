import { createClient } from "@/lib/supabase/server";
import { requireAgencyStaff } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Building2,
  Plug,
  Target,
  UserPlus,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  done: boolean;
  href: string;
  cta: string;
}

export default async function WelcomePage() {
  const user = await requireAgencyStaff();
  if (!user.company_id) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: brands }, { data: connections }, { data: goals }, { data: clientUsers }] = await Promise.all([
    supabase.from("brands").select("id").eq("company_id", user.company_id).limit(1),
    supabase.from("brand_ad_accounts").select("id").eq("company_id", user.company_id).limit(1),
    supabase.from("kpi_targets").select("id").eq("company_id", user.company_id).eq("is_active", true).limit(1),
    supabase
      .from("users")
      .select("id")
      .eq("company_id", user.company_id)
      .eq("role", "client")
      .limit(1),
  ]);

  const brandsExist = (brands?.length ?? 0) > 0;
  const connectionsExist = (connections?.length ?? 0) > 0;
  const goalsExist = (goals?.length ?? 0) > 0;
  const clientUsersExist = (clientUsers?.length ?? 0) > 0;

  const allDone = brandsExist && connectionsExist && goalsExist && clientUsersExist;

  const steps: Step[] = [
    {
      id: "brand",
      title: "Add your first client",
      description: "Create a brand record so all their ad data has a home.",
      icon: Building2,
      done: brandsExist,
      href: "/clients/new",
      cta: "Add brand",
    },
    {
      id: "client_user",
      title: "Invite the client to their portal",
      description:
        "Generate a login so the brand owner can self-serve their dashboard.",
      icon: UserPlus,
      done: clientUsersExist,
      href: brandsExist ? `/clients/${brands![0].id}?tab=users` : "/clients",
      cta: "Set up client login",
    },
    {
      id: "connection",
      title: "Connect ad accounts",
      description:
        "Once the client connects via Zernio, paste the external account ID so syncing starts.",
      icon: Plug,
      done: connectionsExist,
      href: brandsExist ? `/clients/${brands![0].id}?tab=connections` : "/clients",
      cta: "Connect ads",
    },
    {
      id: "goals",
      title: "Set monthly goals",
      description:
        "Spend cap, revenue target, ROAS — pacing shows up live on the client portal.",
      icon: Target,
      done: goalsExist,
      href: brandsExist ? `/clients/${brands![0].id}?tab=goals` : "/clients",
      cta: "Set goals",
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <header className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-black" strokeWidth={2.5} />
        </div>
        <h1 className="font-display font-extrabold text-3xl lg:text-4xl mb-2">
          Welcome to AdSolution, {user.full_name.split(" ")[0]}
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Four steps to get your agency tracking client ad performance in one dashboard.
        </p>
      </header>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2">
          <span className="font-bold">
            {completed} of {steps.length} steps complete
          </span>
          <span>{Math.round((completed / steps.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.id}
              className={`!p-4 ${step.done ? "!bg-emerald-500/5 !border-emerald-500/20" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.done ? "bg-emerald-500/15" : "bg-white/5"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
                      Step {i + 1}
                    </span>
                    {step.done && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                        Done
                      </span>
                    )}
                  </div>
                  <div className="font-bold mb-0.5">{step.title}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {step.description}
                  </div>
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-orange)] text-[#0a0a0a] hover:bg-[var(--color-orange-hover)] transition whitespace-nowrap"
                  >
                    {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {allDone ? (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 p-5 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="font-bold text-emerald-300 mb-1">You&apos;re all set up.</div>
          <div className="text-xs text-[var(--color-text-secondary)] mb-4">
            Sync runs hourly. Tomorrow morning, your client&apos;s first dashboard will be live.
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-orange)] text-[#0a0a0a]"
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Skip for now → Open dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
