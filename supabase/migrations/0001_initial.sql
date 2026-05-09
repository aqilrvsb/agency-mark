-- ============================================================================
-- AdSolution.my — Initial schema (built on existing companies/users/brands base)
-- ============================================================================
-- Run this in your NEW Supabase SQL editor.
-- Wipes data, rebuilds schema for: Master Admin → Agency → Client architecture.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing constraints we'll modify (idempotent)
-- ============================================================================
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- ============================================================================
-- STEP 2: CORE TABLES (re-create if not exist)
-- ============================================================================

-- Companies = Agencies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text UNIQUE,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users (staff + clients + platform admin)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL,
  leader_id uuid REFERENCES public.users(id),
  is_active boolean DEFAULT true,
  id_staff text UNIQUE,
  whatsapp_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role = ANY (ARRAY[
    'platform_admin'::text,
    'bod'::text,
    'leader'::text,
    'marketer'::text,
    'client'::text
  ]))
);

-- Brands = Agency's clients (the businesses being advertised for)
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  -- For client portal: which user (role='client') is assigned to view this brand
  assigned_client_user_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 3: ADZVISER INTEGRATION (replaces CSV import flow)
-- ============================================================================

-- One Adzviser API key per agency (master admin manages these)
CREATE TABLE IF NOT EXISTS public.adzviser_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  workspace_id text,
  is_active boolean DEFAULT true,
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Per-brand ad account mapping (which Adzviser ad account belongs to which brand)
CREATE TABLE IF NOT EXISTS public.brand_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('meta', 'tiktok')),
  external_account_id text NOT NULL,
  external_account_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (platform, external_account_id)
);

-- Sync logs (audit trail)
CREATE TABLE IF NOT EXISTS public.adzviser_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('meta', 'tiktok')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  rows_fetched integer,
  error_message text,
  synced_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 4: AD DATA STORAGE (cached from Adzviser)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ad_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  marketer_id uuid REFERENCES public.users(id),
  platform text NOT NULL CHECK (platform IN ('meta', 'tiktok')),
  date_start date NOT NULL,
  date_end date NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_data_brand_dates ON public.ad_data (brand_id, date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_ad_data_company ON public.ad_data (company_id);

-- ============================================================================
-- STEP 5: BILLING (master admin → agency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  monthly_price_myr numeric NOT NULL,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  payment_provider text,
  external_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  amount_myr numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  issued_at timestamptz DEFAULT now(),
  due_date date,
  paid_at timestamptz,
  notes text
);

-- ============================================================================
-- STEP 6: BUDGET MANAGEMENT (agency tracks per-client budget)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_balance_myr numeric NOT NULL DEFAULT 0,
  total_topup_myr numeric NOT NULL DEFAULT 0,
  total_spent_myr numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  amount_myr numeric NOT NULL,
  payment_method text,
  reference text,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 7: NOTIFICATIONS, ALERTS, ACTIVITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric text NOT NULL,
  condition text NOT NULL,
  threshold numeric,
  severity text NOT NULL DEFAULT 'warning',
  notify_roles text[] DEFAULT '{bod,leader}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  marketer_id uuid REFERENCES public.users(id),
  campaign_name text,
  metric text NOT NULL,
  current_value numeric,
  threshold_value numeric,
  severity text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 8: KPI + Marketer scoring (carried over from your existing schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  metric text NOT NULL,
  target_value numeric NOT NULL,
  warning_threshold numeric,
  danger_threshold numeric,
  direction text NOT NULL DEFAULT 'lower_is_better',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketer_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  marketer_id uuid NOT NULL REFERENCES public.users(id),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  score_date date NOT NULL,
  total_spend numeric DEFAULT 0,
  total_impressions bigint DEFAULT 0,
  total_clicks bigint DEFAULT 0,
  total_leads bigint DEFAULT 0,
  total_purchases bigint DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_cpa numeric,
  avg_roas numeric,
  avg_ctr numeric,
  avg_cpc numeric,
  score_rating text DEFAULT 'neutral',
  campaigns_active integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 9: Reference data — FB columns, custom columns, column views
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fb_columns (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL,
  data_type text NOT NULL DEFAULT 'text',
  is_default boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL DEFAULT 'text',
  formula text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_column_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  column_order jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 10: Site settings (master admin global config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 11: WIPE all rows (fresh start)
-- ============================================================================

TRUNCATE
  public.activity_logs,
  public.alert_history,
  public.alert_rules,
  public.notifications,
  public.budget_topups,
  public.client_budgets,
  public.invoices,
  public.agency_subscriptions,
  public.ad_data,
  public.adzviser_sync_logs,
  public.brand_ad_accounts,
  public.adzviser_connections,
  public.marketer_scores,
  public.kpi_targets,
  public.company_column_views,
  public.custom_columns,
  public.brands,
  public.users,
  public.companies,
  public.fb_columns,
  public.site_settings
RESTART IDENTITY CASCADE;

-- ============================================================================
-- STEP 12: Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_company ON public.users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_brands_company ON public.brands (company_id);
CREATE INDEX IF NOT EXISTS idx_brand_ad_accounts_brand ON public.brand_ad_accounts (brand_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON public.activity_logs (company_id, created_at DESC);

-- ============================================================================
-- DONE — next: enable RLS and create policies (see 0002_rls.sql)
-- ============================================================================
