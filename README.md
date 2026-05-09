# AdSolution.my

White-label SaaS for marketing agencies that manage 100+ FB & TikTok ad clients.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│ MASTER ADMIN (you) — sees Adzviser internals            │
│ /platform/*                                              │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌──────────────────────────────┐
│ AGENCY (sees only "FB Ads")  │
│ /dashboard/*                 │
│ Roles: BOD, Leader, Marketer │
└────────────────┬─────────────┘
                 │
                 ↓
┌──────────────────────────────┐
│ CLIENT (sees only their data) │
│ /client/*                    │
└──────────────────────────────┘
```

**Backend pipeline (hidden from agencies):**

```
Adzviser ($48.99/mo) → BigQuery (~$5/mo) → Supabase (your data) → Next.js dashboards
```

## 📋 Tech stack

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind v4
- Supabase (Postgres + Auth + RLS)
- @google-cloud/bigquery (poll Adzviser-pushed tables)
- Vercel (hosting + cron)
- Adzviser (data extraction backend)

## 🚀 Setup runbook

### Step 1: Install dependencies

```bash
cd E:\Project\AdSolution
npm install
```

### Step 2: Create new Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Note: Project URL, anon key, service_role key
3. In SQL Editor, run in order:
   - `supabase/migrations/0001_initial.sql` (creates tables, wipes data)
   - `supabase/migrations/0002_rls.sql` (enables Row Level Security)

### Step 3: Set up Google Cloud Platform (BigQuery)

1. Create a new GCP project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **BigQuery API**
3. Create a service account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Roles: **BigQuery Data Editor** + **BigQuery Job User**
4. Generate JSON key (Keys → Add Key → Create New Key → JSON)
5. Save the JSON content for env var

### Step 4: Set up Adzviser (master admin)

1. Sign up at [adzviser.com](https://adzviser.com) (Starter plan, $48.99/mo, 3 sources)
2. **Don't connect ad accounts yet** — you'll do this per-agency

### Step 5: Configure environment

Copy `.env.example` → `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

GCP_PROJECT_ID=your-gcp-project-id
GCP_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

CRON_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Create your master admin account

1. Run dev server: `npm run dev`
2. Open http://localhost:3000/register
3. Sign up with **agency name = "AdSolution Master"** (placeholder)
4. In Supabase SQL editor, promote yourself:

```sql
UPDATE public.users
SET role = 'platform_admin'
WHERE email = 'your@email.com';
```

5. Sign out, sign back in → you should land on `/platform`

### Step 7: Onboard your first agency

**In your Next.js app (master admin view):**

1. Go to `/platform/agencies` → **Add agency**
2. Fill in agency name + BOD's name/email/temp password
3. After creation, you'll land on the agency's detail page

**Then in Adzviser dashboard (you = master account):**

1. Go to [adzviser.com/set-up](https://adzviser.com/set-up)
2. Click **+ Add workspace**
3. Name it: `agency_<prefix>` (e.g., `agency_berani-marketing-sdn-bhd`)
4. Connect 3 sources to this workspace:
   - **Facebook Ads** (paste agency's FB Business credentials)
   - **Facebook Insights**
   - **TikTok Ads**
5. Add all the agency's clients' ad accounts into this workspace
6. Go to **BigQuery destination** → Create new pipeline
7. Paste your GCP service account JSON
8. Schedule **Daily, Yesterday's data, 03:00 UTC**
9. Note the BigQuery dataset name (e.g., `agency_berani_marketing_sdn_bhd_workspace`)

**Back in your Next.js app:**

1. Open the agency's detail page
2. **Adzviser configuration** form:
   - API key: `adv_live_...` (copy from Adzviser dashboard)
   - **BigQuery Dataset**: paste the dataset name from step 9 above
   - Notes: optional
3. Click **Save configuration**
4. Map ad account IDs → brand IDs in `brand_ad_accounts` table:

```sql
INSERT INTO brand_ad_accounts (brand_id, company_id, platform, external_account_id, external_account_name)
VALUES (
  '<brand_uuid>',
  '<company_uuid>',
  'meta',  -- or 'tiktok'
  '<adzviser_ad_account_id>',
  'ABC Skincare FB Account'
);
```

5. Click **Sync now** → should pull data from BigQuery into Supabase

### Step 8: Production deploy (Vercel)

```bash
npm install -g vercel
vercel login
vercel --prod
```

In Vercel dashboard, add all env vars from `.env.local`.

The cron is already configured in `vercel.json`:

```json
{ "path": "/api/cron/sync", "schedule": "0 * * * *" }
```

It will run hourly, syncing all agencies' BigQuery → Supabase.

## 🗂️ Project structure

```
app/
├── page.tsx                       Landing page (sales)
├── (auth)/
│   ├── login/                     Login
│   ├── register/                  Agency self-register
│   └── forgot-password/           Password reset
├── (platform)/                    MASTER ADMIN
│   ├── layout.tsx                 Sidebar with platform nav
│   └── platform/
│       ├── page.tsx               Overview
│       ├── agencies/              List + detail + new
│       ├── adzviser-keys/         Bird's-eye view of all keys
│       ├── invoices/              All invoices
│       └── settings/              Platform config
├── (agency)/                      AGENCY (BOD/Leader/Marketer)
│   ├── layout.tsx                 Sidebar with agency nav
│   ├── dashboard/                 Overview
│   ├── clients/                   List + detail + new
│   ├── campaigns/                 Last 30d ad performance
│   ├── analytics/                 Daily spend trend
│   ├── invoices/                  Their AdSolution invoices
│   ├── staff/                     Team members
│   └── settings/                  Agency config
├── (client)/                      CLIENT (read-only portal)
│   ├── layout.tsx                 Sidebar with client nav
│   └── client/
│       ├── overview/              Dashboard
│       ├── campaigns/             Campaign performance
│       ├── budget/                Budget + topup history
│       ├── reports/               Monthly reports
│       └── settings/              Profile
└── api/
    ├── auth/register-agency/      Self-serve agency register
    ├── platform/
    │   ├── adzviser-connection/   Save Adzviser config
    │   └── sync-now/              Manual sync trigger
    ├── agency/brands/             Create brand
    └── cron/
        ├── sync/                  Hourly cron (all agencies)
        └── sync-agency/           Single agency sync

lib/
├── supabase/                      Auth helpers
├── auth/guards.ts                 Role-based redirect guards
├── bigquery/
│   ├── client.ts                  GCP BigQuery client
│   └── sync.ts                    BigQuery → Supabase pipeline
├── adzviser/client.ts             (legacy stub — not used)
└── utils.ts                       cn helper

components/
├── ui/                            Button, Input, Card, Table
└── sign-out-button.tsx

supabase/migrations/
├── 0001_initial.sql               Schema + truncate
└── 0002_rls.sql                   Row Level Security
```

## 💰 Pricing economics

| Item | Monthly USD | MYR |
|---|---|---|
| Adzviser Starter | $48.99 | ~RM 192 |
| Google BigQuery | ~$5 | ~RM 20 |
| Vercel Pro (when needed) | $20 | ~RM 78 |
| Supabase Pro | $25 | ~RM 98 |
| **Total backend** | **~$99** | **~RM 388** |

**At 100 agencies × RM 199/mo each:**

- Revenue: **RM 19,900/mo**
- Backend: ~RM 388/mo
- Net profit: **~RM 19,500/mo (98% margin)**

## 🔐 Security

- **RLS enforces tenant isolation** — agencies cannot see each other's data
- **Adzviser API keys never leave master admin role** — agencies/clients never see them
- **Service account JSON stored in env** — never committed to git
- **CRON_SECRET protects cron endpoints** — prevents unauthorized sync triggers

## 🎨 Design system

Inherited from HCKCREA (peninglab.com):

- Dark canvas (`#0a0a0a`)
- Highfield yellow (`#facc15`) primary
- Neon-lime (`#c8f53e`) secondary CTA
- Bricolage Grotesque (display) + DM Sans (body)
- Bahasa Malaysia copy with fear/comparison hooks

## 🐛 Troubleshooting

**Q: Sync returns 0 rows.**
A: Check (1) BigQuery dataset name in agency config matches actual dataset, (2) `brand_ad_accounts` mapping exists for ad accounts, (3) Adzviser pipeline has run at least once (check Adzviser → BigQuery → Export History).

**Q: Agency staff can see master admin pages.**
A: Check `users.role` is correctly set. Only `role = 'platform_admin'` should access `/platform/*`. Middleware at `lib/supabase/middleware.ts` enforces this.

**Q: Client portal shows "No brand assigned".**
A: Set `brands.assigned_client_user_id` to the client user's UUID:

```sql
UPDATE brands SET assigned_client_user_id = '<user_uuid>' WHERE id = '<brand_uuid>';
```

**Q: Adzviser payment failed (Malaysian card).**
A: Try a different card, or use Wise/Revolut for international payments. If still failing, contact Adzviser support.

## 📜 License

Private — © 2026 AdSolution.my
