import Link from "next/link";
import {
  Sparkles, ArrowRight, Zap, Wallet, Users, TrendingUp, Brain, Flame,
  CheckCircle2, ShieldCheck, Star, Quote, Clock, BarChart3, Layers, Lock,
  Database, Eye, Building2, ChevronRight, AlertTriangle,
} from "lucide-react";

export const revalidate = 3600;

const STATS = [
  { num: "100+", label: "client per agensi" },
  { num: "238", label: "FB Ads metrics" },
  { num: "3 min", label: "setup setiap client" },
  { num: "RM 0", label: "untuk 14 hari" },
];

const TESTIMONIALS = [
  { quote: "Dulu manual import CSV setiap pagi untuk 20 client. Sekarang automatic. Save 3 jam sehari.", name: "Faiz A.", title: "Founder, KL Agency" },
  { quote: "Client portal jimatkan email back-and-forth. Mereka log in, tengok sendiri performance.", name: "Sarah M.", title: "Account Manager" },
  { quote: "RM199/bulan jaga 100 client. Kompetitor charge RM2,000+. Maths senang.", name: "Hafiz Z.", title: "Director, PJ Marketing" },
  { quote: "Setup brand baru in 3 minit. Adzviser belakang tabir, client tak perlu tahu.", name: "Aina R.", title: "Head of Ops" },
  { quote: "BOD/Leader/Marketer roles built-in. Tak perlu setup permission sendiri.", name: "Rahman T.", title: "Tech Lead" },
  { quote: "ROAS, CPM, CPC semua dalam satu dashboard. Client meeting dah jadi 15 minit, bukan 1 jam.", name: "Nadia M.", title: "Senior Marketer" },
];

const FAQ = [
  { q: "Saya kena ada berapa client untuk worth it?", a: "Mula dari 1 client. Free 14 hari trial, tiada credit card required. Plan Pro RM199/bulan handle 100 client tanpa upgrade." },
  { q: "Berapa cepat setup?", a: "Daftar agensi dalam 2 minit. Tambah client pertama dalam 3 minit. Data FB+TikTok auto-sync dalam masa 24 jam pertama." },
  { q: "Macam mana data FB & TikTok masuk?", a: "Kami handle integration. Anda hanya perlu tambah client + ad account ID. Data tarik automatic setiap hari ke dashboard anda." },
  { q: "Boleh white-label client portal?", a: "Ya. Pro plan ada custom domain, logo, brand colors. Client anda tengok dashboard branded dengan agensi anda — bukan AdSolution." },
  { q: "Boleh cancel bila-bila?", a: "Ya. Tiada kontrak. Cancel anytime dari dashboard. Refund pro-rata jika cancel dalam tempoh billing semasa." },
  { q: "Data saya selamat?", a: "Supabase + Postgres dengan Row Level Security. Setiap agensi data berasingan. Client cuma nampak brand mereka. Audit log built-in." },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="bg-sky" />
      <div className="bg-grid" />
      <div className="bg-soft-glow" style={{ background: "radial-gradient(circle, #ffd4b8, transparent 70%)", width: 700, height: 700, top: -250, right: -150 }} />
      <div className="bg-soft-glow" style={{ background: "radial-gradient(circle, #ffe0c4, transparent 70%)", width: 600, height: 600, top: 50, left: -200 }} />
      <div className="bg-noise" />

      {/* Top urgency banner */}
      <div className="relative z-30" style={{ background: "#ffff00", color: "#000" }}>
        <div className="mx-auto max-w-7xl px-6 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-center">
          <Flame className="w-3.5 h-3.5 animate-pulse flex-shrink-0" style={{ color: "#ea580c" }} />
          <span>
            <strong>Promo RM199/bulan</strong> untuk early agencies. Tinggal{" "}
            <strong>23 slot</strong> sebelum harga normal RM499/bulan.
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-20 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight">AdSolution</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition">
            Sign in
          </Link>
          <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm sm:text-base font-extrabold transition-transform hover:scale-[1.04] hover:-translate-y-0.5"
            style={{ background: "var(--color-lime)", color: "#0a0a0a", boxShadow: "0 6px 20px rgba(200, 245, 62, 0.3)" }}>
            Mula percuma <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-20">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-emerald-700">
                Trusted by 50+ agencies in Malaysia
              </span>
            </div>

            <h1 className="font-display font-extrabold tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[0.95] mb-7">
              <span className="block">Urus 100 client</span>
              <span className="block"><span className="gradient-text-multi">FB &amp; TikTok ads.</span></span>
              <span className="block">Satu dashboard.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] mb-8 leading-relaxed max-w-xl">
              <strong className="text-[var(--color-text-primary)]">Stop import CSV setiap pagi.</strong>{" "}
              Data FB &amp; TikTok auto-sync. White-label client portal siap. BOD/Leader/Marketer
              roles built-in. Mula 14 hari free, tiada kad kredit.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <Link href="/register" className="btn-primary group">
                Daftar agensi anda — 14 hari FREE
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <a href="#pricing" className="btn-secondary">
                <Eye className="w-4 h-4" />
                Tengok pricing
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <span className="text-[var(--color-text-secondary)]">4.9 rating dari 50+ agensi</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>30-day money-back</span>
              </div>
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative max-w-[440px] mx-auto">
              <div className="card animate-float" style={{ padding: 24 }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] font-bold">All clients</div>
                  <div className="px-2 py-1 rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-400">LIVE</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Total Spend</div>
                    <div className="font-display font-extrabold text-2xl mt-1">RM 142K</div>
                    <div className="text-xs text-emerald-400 mt-1">+12% vs lepas</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                    <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">ROAS</div>
                    <div className="font-display font-extrabold text-2xl mt-1" style={{ color: "var(--color-lime)" }}>4.2x</div>
                    <div className="text-xs text-emerald-400 mt-1">healthy</div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "ABC Skincare", roas: "5.8x", color: "from-emerald-400 to-cyan-400" },
                    { name: "XYZ Tudung", roas: "3.2x", color: "from-orange-400 to-pink-400" },
                    { name: "Burger Guy KL", roas: "4.1x", color: "from-amber-300 to-orange-400" },
                    { name: "Suplemen Pro", roas: "6.7x", color: "from-violet-400 to-fuchsia-400" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.color}`} />
                      <div className="flex-1 text-sm font-medium">{c.name}</div>
                      <div className="text-xs font-mono font-bold text-emerald-400">{c.roas}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USP Strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 -mt-4 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { icon: Database, label: "Auto-sync", title: "Data tarik automatic", desc: "FB + TikTok performance setiap pagi. Tak perlu CSV import.", color: "orange" },
            { icon: Users, label: "Multi-tenant", title: "100 client, 1 dashboard", desc: "BOD/Leader/Marketer roles + client portal white-label.", color: "lime" },
            { icon: Wallet, label: "Pricing", title: "RM199/bulan flat", desc: "Tiada per-client fee. Scale 1 client atau 1,000 client.", color: "amber" },
          ] as const).map((u, i) => {
            const Icon = u.icon;
            const colorMap = {
              orange: { bg: "rgba(255,87,34,0.08)", border: "rgba(255,87,34,0.25)", glow: "rgba(255,87,34,0.25)", text: "var(--color-orange)" },
              lime: { bg: "rgba(200,245,62,0.08)", border: "rgba(200,245,62,0.3)", glow: "rgba(200,245,62,0.25)", text: "var(--color-lime)" },
              amber: { bg: "rgba(255,183,0,0.08)", border: "rgba(255,183,0,0.3)", glow: "rgba(255,183,0,0.25)", text: "var(--color-amber)" },
            }[u.color];
            return (
              <div key={i} className="relative overflow-hidden rounded-3xl p-7 border" style={{ background: `linear-gradient(135deg, ${colorMap.bg} 0%, transparent 100%)`, borderColor: colorMap.border }}>
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${colorMap.glow}, transparent 70%)`, filter: "blur(30px)" }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colorMap.bg, border: `1px solid ${colorMap.border}` }}>
                      <Icon className="w-5 h-5" style={{ color: colorMap.text }} strokeWidth={2.4} />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: colorMap.text }}>{u.label}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-3xl mb-2">{u.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{u.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fear hook */}
      <section className="relative z-10 my-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl text-center py-14 sm:py-20 px-6"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)" }}>
            <div className="absolute" style={{ top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.25), transparent 70%)", filter: "blur(40px)" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-red-300">Realiti agensi</span>
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl text-white leading-[1.1] mb-6 max-w-4xl mx-auto">
                30 client. CSV import setiap hari.
                <br />
                <span style={{ background: "linear-gradient(135deg, #f87171 0%, #fb923c 50%, #fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Anda masih buat manual?
                </span>
              </h2>
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto mb-8">
                Setiap pagi marketer download CSV dari FB Ads Manager. Buka TikTok Ads. Combine.
                Email client. 3 jam dah lesap. Sementara kompetitor anda dah buka pintu — software pun
                generate report sendiri.
              </p>
              <Link href="/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-2xl hover:scale-[1.03] transition-transform"
                style={{ background: "var(--color-lime)", color: "#0a0a0a" }}>
                <Flame className="w-4 h-4" />
                Saya nak automate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="relative overflow-hidden rounded-3xl px-6 sm:px-10 py-8 sm:py-10 border"
          style={{ background: "linear-gradient(135deg, rgba(200,245,62,0.05) 0%, rgba(200,245,62,0.02) 100%)", borderColor: "rgba(200,245,62,0.2)" }}>
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(200,245,62,0.15), transparent 70%)", filter: "blur(40px)" }} />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {STATS.map((s, i) => (
              <div key={i}>
                <div className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight" style={{ color: "var(--color-lime)" }}>{s.num}</div>
                <div className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain agitation */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-12">
          <div className="chip mb-5"><Flame className="w-3.5 h-3.5" /><span>Masalah agensi sekarang</span></div>
          <h2 className="section-heading max-w-3xl mx-auto">
            Setiap hari tanpa system = <span className="gradient-text-warm">duit hilang</span>.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: Clock, title: "Manual CSV", desc: "Setiap pagi 30 minit download CSV FB + TikTok. Itu pun untuk 1 client." },
            { icon: AlertTriangle, title: "Client tanya 24/7", desc: "WhatsApp 'spend macam mana?' setiap hari. Reply manual letih." },
            { icon: Layers, title: "Tools berlambak", desc: "FB Manager, TikTok, Sheets, Excel, Looker — semua tab berbeza." },
            { icon: Lock, title: "Permission pening", desc: "BOD nak tengok semua. Marketer cuma client dia. Setup susah." },
            { icon: TrendingUp, title: "Susah scale", desc: "Cap pada 20 client sebab manpower. Nak 100 client? Mustahil." },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="card group" style={{ borderColor: "rgba(239,68,68,0.18)" }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.25), transparent 70%)", filter: "blur(20px)" }} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <Icon className="w-7 h-7 text-red-400" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-display font-bold text-2xl mb-3">{p.title}</h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-10">
          <div className="chip mb-5"><Sparkles className="w-3.5 h-3.5" /><span>Apa yang anda dapat</span></div>
          <h2 className="section-heading max-w-3xl mx-auto">
            5 senjata yang buat agensi anda <span className="gradient-text-warm">10x lebih efficient</span>.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bento" style={{ minHeight: 320 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-orange-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-violet-600" strokeWidth={2.2} />
              </div>
              <div className="tag-mono">★ AUTO-SYNC</div>
            </div>
            <h3 className="font-display font-extrabold text-3xl md:text-4xl mb-3 leading-tight">
              FB + TikTok data
              <br /><span className="gradient-text-violet">tarik automatic.</span>
            </h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-6 max-w-md">
              Tak payah login Ads Manager. Tak perlu CSV. Setiap pagi data spend, ROAS, CPM, conversions — siap dalam dashboard. 238 metrics FB + 80 metrics TikTok.
            </p>
            <div className="flex gap-2 flex-wrap">
              {["Spend", "ROAS", "CPM", "CPC", "CTR", "Conversions", "Reach", "+232 lagi"].map((m, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-700 text-xs font-mono font-bold">{m}</span>
              ))}
            </div>
          </div>

          <div className="bento">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" strokeWidth={2.2} />
              </div>
              <div className="tag-mono tag-mono-blue">CLIENT PORTAL</div>
            </div>
            <h3 className="font-display font-bold text-2xl mb-2 leading-tight">
              Client login <span className="text-blue-600">tengok sendiri</span>.
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              White-label dashboard untuk client. Custom logo, custom domain. Mereka tengok ROAS sendiri — anda fokus optimize.
            </p>
          </div>

          <div className="bento">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" strokeWidth={2.2} />
              </div>
              <div className="tag-mono tag-mono-pink">ROLES</div>
            </div>
            <h3 className="font-display font-bold text-2xl mb-2 leading-tight">
              <span className="text-pink-600">BOD/Leader/Marketer.</span> Built-in.
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
              BOD tengok semua. Leader tengok team dia. Marketer tengok assigned client. RLS enforce di database level.
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {["BOD", "Leader", "Marketer", "Client"].map((r, i) => (
                <span key={i} className="px-2 py-1 rounded bg-pink-50 text-pink-700 text-[10px] font-mono font-bold border border-pink-100">{r}</span>
              ))}
            </div>
          </div>

          <div className="bento">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" strokeWidth={2.2} />
              </div>
              <div className="tag-mono tag-mono-amber">REPORTING</div>
            </div>
            <h3 className="font-display font-bold text-2xl mb-2 leading-tight">
              Marketer scoring <span className="text-amber-600">automatic</span>.
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Performance setiap marketer di-track. KPI targets, alert rules, daily score. Tak perlu Excel evaluation lagi.
            </p>
          </div>

          <div className="bento">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" strokeWidth={2.2} />
              </div>
              <div className="tag-mono tag-mono-emerald">BUDGET</div>
            </div>
            <h3 className="font-display font-bold text-2xl mb-2 leading-tight">
              Budget tracking. <span className="text-emerald-600">Topup auto.</span>
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Setiap client ada budget balance. Spend deduct automatic. Topup via Stripe/FPX. Notify bila low.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-10">
          <div className="chip mb-5">Pricing</div>
          <h2 className="section-heading">
            Satu plan, <span className="gradient-text-warm">unlimited client</span>.
          </h2>
          <p className="mt-5 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Scale dari 1 client ke 100 client tanpa upgrade. Free 14 hari trial.
          </p>
        </div>

        <div className="max-w-2xl mx-auto relative pt-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/35 whitespace-nowrap">
            ⚡ Early agency offer · Save 60%
          </div>
          <div className="card border-2 border-orange-300 shadow-2xl shadow-orange-500/15 p-8 md:p-12 relative" style={{ overflow: "visible" }}>
            <div className="absolute pointer-events-none rounded-3xl opacity-50" style={{ top: -40, right: -40, width: 220, height: 220, background: "radial-gradient(circle, rgba(255,77,0,0.18), transparent 70%)", filter: "blur(40px)" }} />
            <div className="relative">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-white mb-4"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}>
                  <Sparkles className="w-3 h-3" /> Pro
                </div>
                <h3 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight mb-2">
                  Akses penuh untuk agensi.
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
                  Satu plan, semua features. Tiada per-seat fee, tiada per-client fee.
                </p>
              </div>

              <div className="text-center mb-7">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <span className="text-2xl font-display font-bold text-[var(--color-text-muted)] line-through decoration-red-500 decoration-[3px]">RM499</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 rounded-md">Save RM300</span>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display font-extrabold text-7xl md:text-8xl tracking-tight gradient-text-warm leading-none">RM199</span>
                  <span className="text-[var(--color-text-muted)] text-base">/bulan</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-orange">Promo period — early agency lock-in.</div>
              </div>

              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                {[
                  "Unlimited client (brand)",
                  "Unlimited staff (BOD/Leader/Marketer)",
                  "FB Ads + TikTok Ads sync",
                  "238 metrics FB + 80 TikTok",
                  "White-label client portal",
                  "Custom domain + logo",
                  "Marketer scoring system",
                  "KPI alerts + notifications",
                  "Budget management + topup",
                  "Invoice + billing built-in",
                  "Activity audit log",
                  "Email + WhatsApp support",
                ].map((f, j) => (
                  <div key={j} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--color-text-secondary)]">{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" className="btn-primary w-full justify-center text-base py-4">
                Mula 14 hari trial — FREE <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-[var(--color-text-muted)]">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>30-day money back</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Cancel bila-bila</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>FPX / Card</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-24">
        <div className="text-center mb-12 px-6">
          <div className="chip mb-5"><Quote className="w-3.5 h-3.5" /><span>Real agency, real result</span></div>
          <h2 className="section-heading">Bukan janji kosong.</h2>
        </div>

        <div className="relative marquee-mask">
          <div className="marquee-track py-4">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="card flex-shrink-0 w-[340px]">
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[var(--color-text-primary)] leading-relaxed mb-5 text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <div className="chip mb-5"><Brain className="w-3.5 h-3.5" /><span>Soalan biasa</span></div>
          <h2 className="section-heading">FAQ</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <details key={i} className="faq-item">
              <summary>{f.q}</summary>
              <div className="faq-body">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <div className="card text-center py-12 px-8 border-2" style={{ borderColor: "rgba(200,245,62,0.3)" }}>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-4">
            Mula 14 hari trial. <span className="gradient-text-warm">Tiada credit card.</span>
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg mb-8 max-w-xl mx-auto">
            Daftar agensi anda dalam 2 minit. Kalau tak best, cancel — kami tak tanya.
          </p>
          <Link href="/register" className="btn-primary text-base py-4 px-10">
            Daftar agensi sekarang <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--color-border)] mt-12">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-[var(--color-text-primary)]">AdSolution</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[var(--color-text-primary)] transition">Terms</a>
            <a href="#" className="hover:text-[var(--color-text-primary)] transition">Privacy</a>
            <a href="mailto:hello@adsolution.my" className="hover:text-[var(--color-text-primary)] transition">hello@adsolution.my</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
