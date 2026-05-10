# AdSolution.my — Engineering Context

This file is loaded at session start. It exists so any AI session (or human dev) can pick up the work without re-discovering everything from scratch. Keep it concise but complete — when a new feature lands, update the relevant section.

---

## What this is

A white-label SaaS for Malaysian marketing agencies to monitor their clients' Facebook + TikTok + Google ad campaigns. **Three role tiers**:

- `platform_admin` (master/superadmin) — owns the Zernio API key and the Vercel deployment
- Agency staff: `bod` (board), `leader`, `marketer` — work inside one agency (`company_id` scope)
- `client` — read-only access to one assigned brand's dashboard

White-label rule: agencies and their clients must NEVER see "Zernio" or its UI. Zernio is a backend-only data provider for us. The brand the client sees is the agency's brand, fronted by AdSolution.

---

## Stack + deployment

- **Frontend / API**: Next.js 16.2.4 (Turbopack), React 19, Tailwind v4
- **Database / Auth**: Supabase (Postgres + RLS + Auth)
- **Data provider**: Zernio REST API at `https://zernio.com/api/v1` (replaced BigQuery / Adzviser)
- **Hosting**: Vercel `sin1` region (Singapore for SEA latency)
- **Repo**: `aqilrvsb/agency-mark` on GitHub (note: repo name diverges from product name "AdSolution")
- **Vercel project**: `agency-mark` (project id `prj_aaSFEPy8uxSmHkhz1QFO4mctaUod`, team id `team_vPDWBTQjgWiEVzkI5Djqcty6`, slug `aqils-projects-b30dfc7a`)
- **Supabase project**: `marketer` (ref `ezmxelfspawakfxeujdd`, ap-southeast-1)
- **Live URL**: https://agency-mark.vercel.app
- **Cron secret** (used in `Authorization: Bearer ...` for /api/cron/*): see Vercel env `CRON_SECRET`

---

## Critical user instructions (durable)

These persist across sessions:

1. **Autonomous execution**: user said "stop ask me...i allow all...up 2 u...what i want is...final saas ultimate agency marketing....no 1...in malaysia". Pick the highest-impact next thing and ship without asking.
2. **No demo / synthetic data**: when the user said "real data", they meant it. The `/api/admin/seed-demo` endpoint and any synthetic data generators have been removed. If a dashboard is empty, show the empty state — don't fabricate.
3. **Skip AI placeholder**: user said "skip ai" — the `<AINarrativeCard />` component renders a static placeholder copy, not an LLM. Don't wire Anthropic SDK unless explicitly asked.
4. **The agency's brand fronts the client**: white-label means the client portal must never reveal "Zernio" or the upstream stack.

---

## Repo layout (highlights)

```
app/
  (auth)/login, register, forgot-password
  (agency)/                      # agency staff portal
    dashboard/page.tsx           # AgencyAnalytics-style client tile grid
    clients/[id]/page.tsx        # Client Profile Hub with sub-tabs
    campaigns, analytics, reports, invoices, staff, activity, settings
    welcome/page.tsx             # 4-step onboarding wizard for empty agencies
  (client)/client/               # client read-only portal
    overview/page.tsx            # the main dashboard
    facebook,google,tiktok/      # platform-specific pages: campaigns / adsets / ads
    campaign/[id]/page.tsx       # per-campaign drill-down (Top Campaigns table → here)
    connections/page.tsx         # "Connect Ad Accounts" UX
    budget, reports, notifications, support, settings
  api/
    cron/sync                   # hourly Zernio → ad_data sync (POST /api/cron/sync)
    cron/anomaly-check          # nightly 1AM UTC alert scan
    cron/whatsapp-daily-digest  # 1:05 AM UTC client digest
    webhooks/zernio             # Zernio webhook receiver (HMAC verified)
    client/connect/[platform]   # /v1/connect/{platform}/ads OAuth start
    agency/...                  # brand mgmt, KPI targets, ad-accounts CRUD

components/
  client/                       # client-portal UI primitives
  agency/                       # agency-portal UI primitives
  ui/                           # shadcn-ish low-level primitives

lib/
  zernio/                       # Zernio integration
    client.ts                   # ZernioClient — endpoints used:
                                #   getConnectUrl (organic Page connect)
                                #   getAdsConnectUrl (ADS connect — the important one)
                                #   listAdAccounts(socialAccountId) → /v1/ads/accounts
                                #   listAds({adAccountId,fromDate,toDate,platform})
                                #   getAdAnalytics(adId, range)  → /v1/ads/{adId}/analytics
                                #   listAdCampaigns({adAccountId, platform})
    sync.ts                     # syncBrandWindow — chained walk:
                                #   social account → ad accounts → ads → daily metrics
                                # Two-pass: summary always; daily-enhance for spend>0 ads
                                # Throttled to <60 req/min (Zernio rate limit)
    sync-connections.ts         # reconcile Zernio /v1/accounts → brand_ad_accounts
  client-data/                  # data loaders for /client/* pages
    overview-data.ts            # loadOverviewData() — main /client/overview loader
    fetch-brand-data.ts         # loadBrandLevelData() — platform pages
    aggregate.ts                # aggregateAdData() — campaign/adset/ad rollups
    lazy-backfill.ts            # ensureFreshAdData — non-blocking on warm-stale,
                                # blocking only on cold windows
  agency-data/                  # loaders for /(agency)/* pages
  alerts/anomaly-check.ts       # 3-rule anomaly detector for the nightly cron
  whatsapp/send.ts              # Twilio / 360dialog / Wassenger fallback chain
  supabase/                     # Supabase clients (server, browser, admin)
  auth/guards.ts                # requireClient / requireAgencyStaff / requirePlatformAdmin

supabase/migrations/            # numbered migrations 0001..0010 — apply in order
```

---

## Database schema (key tables only)

- `companies` — agencies. RLS enforces `company_id` scope on most reads.
- `users` — extends `auth.users` with `role`, `company_id`, `whatsapp_number`. `client` users are linked to a brand via `brands.assigned_client_user_id`.
- `brands` — agency's clients. One row per brand. Carries `zernio_profile_id` (one Zernio Profile per brand, holds many connected SocialAccounts).
- `brand_ad_accounts` — connected SocialAccounts (Pages / advertiser tokens). After mig 0009 we only persist ADS-side ones (`metaads` / `tiktokads` / `googleads` Zernio platforms). Organic `facebook` / `tiktok` SocialAccounts stay in Zernio but aren't tracked locally.
- `brand_platform_ad_accounts` (mig 0009) — discovered Meta Ad Accounts under each Page (act_X / advertiser_id / customer_id). Currency, timezone, status. RLS scoped per company / per assigned brand.
- `ad_data` — the time-series table. One row per (brand, platform, ad_account, ad, date). JSONB `data` column holds spend / impressions / clicks / conversions / campaign_id / campaign_name / adset_id / adset_name / creative_thumbnail / creative_body. Indexes: `(brand_id, platform, platform_ad_account_id, date_start)`, `(brand_id, ad_id, date_start)`, `(company_id, date_start DESC)` — see mig 0010.
- `kpi_targets`, `chart_annotations`, `client_budgets`, `budget_topups`, `notifications`, `alert_history`, `alert_rules`, `activity_logs`, `agency_subscriptions`, `invoices` — per their names.
- `adzviser_connections` (legacy name, kept for back-compat) — tracks `last_synced_at` per company.
- `adzviser_sync_logs` (legacy name) — sync run history per brand.

---

## Zernio integration — the truth

Researched Nov 2026 via openapi.yaml + live MCP probes. Three vocabularies exist; don't confuse them:

1. **`/v1/connect/{platform}` path enum** — for organic Page/Profile connection (no ads):
   `facebook | instagram | linkedin | twitter | tiktok | youtube | threads | reddit | pinterest | bluesky | googlebusiness | telegram | snapchat | discord`

2. **`/v1/connect/{platform}/ads` path enum** — for ADS connection (this is what we use for ad data):
   `facebook | instagram | linkedin | tiktok | twitter | pinterest | googleads`
   Note Google Ads uses `googleads` here, not `google`.

3. **Stored `SocialAccount.platform` value** (returned by `/v1/accounts`):
   - Organic: `facebook` / `instagram` / `tiktok` / etc.
   - Ads: **`metaads`** / `tiktokads` / `googleads` / `linkedinads` / `pinterestads` / `xads`

4. **`/v1/ads*` endpoint `platform` query param** — yet another vocabulary:
   `facebook | instagram | tiktok | linkedin | pinterest | google | twitter`

The data hierarchy is:

```
SocialAccount (Page)            ← brand_ad_accounts.external_account_id (Zernio _id)
   │  GET /v1/ads/accounts?accountId=X
   ▼
PlatformAdAccount (act_123)     ← brand_platform_ad_accounts.platform_ad_account_id
   │  GET /v1/ads?adAccountId=Y&platform=facebook&fromDate=...&toDate=...
   ▼
Ad (with summary metrics)       ← uses _id as identifier (NOT id — Zernio returns _id)
   │  GET /v1/ads/{adId}/analytics?fromDate=...&toDate=...
   ▼
Per-day timeseries              ← ad_data row per (brand, platform, ad_account, ad, date)
```

**Same-token vs separate-token vs standalone (matters for the connect flow)**:

- **Meta (facebook/instagram)**: same-token. Calling `/v1/connect/facebook/ads` with an existing Page already in Zernio returns `{alreadyConnected: true}` instantly — no second OAuth. Zernio is a Meta Marketing Partner, so the Page token already has ads scope.
- **TikTok**: separate-token. `/v1/connect/tiktok/ads` always returns an `authUrl` for TikTok Business OAuth. Optional `accountId` param: with it = linked mode (Spark Ads work); without it = ads-only mode (Brand Identity required, set via PATCH /v1/connect/tiktok-ads).
- **Google**: standalone. `/v1/connect/googleads/ads` returns Google OAuth URL. No MCC application needed — Zernio uses their developer token.

**Webhook to subscribe to** (we have this): `account.ads.initial_sync_completed` fires when Zernio's 90-day ad backfill finishes for a newly-connected ads account. Until that fires, `/v1/ads` returns 0 even on healthy connections. Our webhook handler at `app/api/webhooks/zernio/route.ts` triggers an internal `syncBrandWindow` when this arrives.

**Rate limit**: 60 req / min globally. Hit by chaining per-ad `getAdAnalytics` calls. The current `syncBrandWindow` does a two-pass strategy: pass 1 writes summary rows from `/v1/ads` (1-2 calls), pass 2 enhances ads with `metrics.spend > 0` to per-day rows via `/v1/ads/{adId}/analytics` throttled at 1.1s/call.

**Bug history** (don't reintroduce):
- We previously called `/v1/ads/analytics?platform=meta_ads&account_id=X` — that endpoint **does not exist**. The real endpoints are `/v1/ads`, `/v1/ads/{id}/analytics`, `/v1/ads/campaigns`.
- We previously read `ad.id` from /v1/ads response — Zernio actually returns `_id`. Use `ad._id ?? ad.id`.
- We previously read `campaignId` / `adSetId` — Zernio uses `platformCampaignId` / `platformAdSetId` on the Ad documents.

---

## MCP servers (configured at `.mcp.json`, gitignored)

Four MCP servers register at Claude Code startup:

1. **supabase** — `@supabase/mcp-server-supabase` with `--project-ref=ezmxelfspawakfxeujdd`. Used for `execute_sql`, `apply_migration`, `list_tables`, `generate_typescript_types`, etc. Auth: `SUPABASE_ACCESS_TOKEN` baked into `.mcp.json`.
2. **vercel** — HTTP MCP at `https://mcp.vercel.com`. Used for `list_deployments`, `get_deployment_build_logs`, `get_project`, etc. (auth handled by Vercel SSO).
3. **playwright** — local MCP for browser automation: `browser_navigate`, `browser_take_screenshot`, `browser_click`, `browser_fill_form`, etc.
4. **zernio** — HTTP MCP at `https://mcp.zernio.com/mcp` with `Authorization: Bearer sk_...` for our master Zernio API key. ~280 tools across `accounts_*`, `profiles_*`, `ads_*`, `connect_*`, `webhooks_*`, etc. The key tools we actually use:
   - `mcp__zernio__profiles_list` — find a brand's Zernio Profile by name
   - `mcp__zernio__accounts_list` — list SocialAccounts in a Profile
   - `mcp__zernio__connect_ads` — trigger `/v1/connect/{platform}/ads` (returns `alreadyConnected` for Meta with existing Page)
   - `mcp__zernio__ads_list_ad_accounts` — list Meta Ad Accounts (act_X) under a SocialAccount
   - `mcp__zernio__ads_list_ads` — list ads in a window (paginated)
   - `mcp__zernio__ads_get_ad_analytics` — per-ad daily breakdown
   - `mcp__zernio__webhooks_create_webhook_settings` / `webhooks_get_webhook_settings`

Permissions: `.claude/settings.local.json` has `mcp__zernio__*`, `mcp__playwright__*`, `mcp__supabase__*`, `mcp__vercel__*` wildcarded so MCP calls don't prompt.

---

## Test brand + login credentials (development)

Active fighter test account (post Fighter pivot):
- **Marketer email**: `fighter-test3@adsolution.my`
- **Brand**: `Aqil Fighter Test` — `id = 60fdc87b-9ba2-4754-98ce-8c8ddcd1ddc3`
- **Zernio Profile**: `6a00c412d32a19d66e5e1b90` "Aqil Fighter Test (AdSolution)" — created via the email-tag dedupe path during register
- **Connected SocialAccount** (same-token reuse — see paywall note below):
  Zernio id `6a00c43d92b3d8e85fb6a556` (platform `facebook`, displayName `Generasi Pintar`, adsStatus `connected`).
  Registered in `brand_ad_accounts` as `meta_ads` via the same-token path in `sync-connections.ts`.
- **Meta Ad Accounts under the Page**:
  - `act_497506625022660` "MD Monirka Shifaq" (MYR, Asia/Kuala_Lumpur)
  - `act_313341980326367` "MD Monir" (MYR, Asia/Singapore, business "MUHAMMAD AQIL AZFAR")
- **Real spend (Meta side)**: ~RM 9.65 on 2026-02-03 across 3 ads in 2 campaigns
  (`kolestrol lead` RM 6.60, `New Engagement campaign` RM 3.05). Visible in /v1/ads
  only after Zernio's `account.ads.initial_sync_completed` webhook fires.

**Same-token paywall recovery** (commit `065ffb1`): the master Zernio account is
on the free 2-account tier. When `/v1/connect/facebook/ads` would push us over
the cap (because Zernio counts soft-deleted-in-grace accounts toward the limit),
the connect route catches the 402 and falls back to discovering the existing
organic `facebook` SocialAccount (which already carries `adsStatus: 'connected'`
with full ads_management/ads_read scopes). `sync-connections.ts` registers same-
token `facebook`/`instagram` accounts as `meta_ads` so the rest of the pipeline
treats them identically to a `metaads` account. listAdAccounts works fine off
the organic SocialAccount id.

Logins (passwords reset to known values for testing):
- **Marketer (Fighter)**: `fighter-test3@adsolution.my` / `TestFighter123!`
- **Platform admin**: `aqil@gmail.com` / `AgencyAdmin123!`

To reset a password from Supabase MCP:
```sql
UPDATE auth.users SET encrypted_password = crypt('NewPass123!', gen_salt('bf')) WHERE email = 'x@y.com';
```

**Important**: the test brand's default `/client/overview` page may show "RM 0" because the spend is on 2026-02-03 and the default window is the last 90 days. To see real numbers, navigate with `?start=2026-01-01&end=2026-05-10` until we extend the default window or auto-detect.

---

## How to test (the playbook)

1. **Local build sanity** — Vercel builds on every push; failed builds show `state: "ERROR"`. Check via `mcp__vercel__list_deployments` then `mcp__vercel__get_deployment_build_logs` if needed. Common failure: TypeScript errors. Fix and re-push.

2. **Verify a fix end-to-end**:
   - `git push`
   - Watch Vercel for `state: "READY"` (~30-90s)
   - Open Playwright: `mcp__playwright__browser_navigate` to the page in question
   - Click / interact via `browser_click`, `browser_fill_form`
   - Screenshot via `browser_take_screenshot`
   - Read screenshot via `Read` tool — image renders in context
   - For SQL state checks: `mcp__supabase__execute_sql` with read-only queries
   - For Zernio state: use the per-account `mcp__zernio__*` tools instead of hitting the live HTTP API

3. **Reset cache to force fresh sync** (when ad_data is stale):
   ```sql
   DELETE FROM ad_data WHERE brand_id = '<brand_id>';
   DELETE FROM adzviser_sync_logs WHERE brand_id = '<brand_id>';
   ```
   Then visit `/client/overview` — `ensureFreshAdData` runs cold and pulls.

4. **Trigger sync from MCP** (no Vercel needed): call `mcp__zernio__connect_ads(platform=facebook, profile_id=<zernio_profile_id>)`. If alreadyConnected:true, the `metaads` SocialAccount exists and you can query `ads_list_ads` directly.

---

## Recent decisions / gotchas (last 7 days)

- **Default date range** is **last 90 days** (matches Zernio's discovery backfill). See `lib/client-data/aggregate.ts:parseDateRange`. Test brand spend on 2026-02-03 is just outside the default — extend window manually until we add a "max-back-from-data" auto-default.
- **Lazy-backfill is now non-blocking on warm-stale** (commit `86faba9`): when ad_data has rows in the requested window AND the cache log is >6h old, we fire `syncBrandWindow` via `void` (no await) and render immediately. Cold windows still block.
- **Per-day chart** comes from the second pass of `syncBrandWindow`, throttled. Can take minutes after first connect.
- **Ad Account filter** lives at `components/client/ad-account-filter.tsx`. URL contract: `?ad_accounts=act_X,act_Y`. Empty/all-selected = blended view. Server filtering at `loadOverviewData` and `loadBrandLevelData` via `.in("platform_ad_account_id", ids)`.
- **Cross-currency rule**: never blend across currencies. Filter chip shows an amber warning when selection mixes currencies.
- **Google Ads via Zernio**: works through `/v1/connect/googleads/ads`. We previously had a "Contact agency" gate — that's wrong; remove it when wiring the UI button.
- **Migration 0009**: added `platform_ad_account_id`, `ad_account_currency`, `ad_id` columns to `ad_data` + the `brand_platform_ad_accounts` table.
- **Migration 0010**: composite indexes on `chart_annotations(brand_id, anchor_date)`, `kpi_targets(brand_id) WHERE is_active`, `brand_platform_ad_accounts(brand_id, platform)`, `adzviser_sync_logs(brand_id, synced_at DESC)`, `ad_data(company_id, date_start DESC)`.

---

## Build / push / commit conventions

- Conventional-style commit messages: `feat:` / `fix:` / `chore:` / `perf:` / `refactor:`
- Never amend or force-push
- Co-author footer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` is the prior pattern
- HEREDOC for multi-line commit messages so newlines survive
- Use `git push 2>&1 | tail -5` to trim noise on Windows shells (CRLF warnings dominate)

---

## Open work / known issues

- TikTok Ads + Google Ads UI flow not E2E tested — the `/connect/{platform}/ads` calls work but no live test brand for those yet.
- The Creative Gallery on `/client/campaign/[id]` renders Meta CDN URLs that **expire** — the next sync refreshes them. If thumbnails 403, run a fresh `syncBrandWindow`.
- Webhook `ZERNIO_WEBHOOK_SECRET` env var is empty in Vercel — receiver skips signature verification when missing. Set it + reconfigure the Zernio webhook to use the same secret to harden.
- Hero `(30D)` label on `/client/budget` was hardcoded; fixed in `741681f` for agency hub but check budget page next time.
- Default range of 90 days misses the test brand's 2026-02-03 spend by ~6 days — consider auto-detecting earliest data date.
- `force-dynamic` on most routes is correct (cookies()-based auth opts dynamic anyway). Don't strip without checking each route's data dependencies.
- Login flow can stick at `/login` for one click on slow networks (cookie write race) — acceptable, just retry.
