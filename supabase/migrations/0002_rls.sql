-- ============================================================================
-- Row Level Security policies
-- ============================================================================
-- Run AFTER 0001_initial.sql.
-- Enforces tenant isolation: agencies see only their own data,
-- platform_admin sees everything, clients see only their assigned brand.
-- ============================================================================

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adzviser_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adzviser_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_column_views ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_company_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_brand_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT b.id FROM public.brands b WHERE b.assigned_client_user_id = auth.uid() LIMIT 1
$$;

-- Companies — platform_admin all, agency users their own
CREATE POLICY companies_select ON public.companies FOR SELECT USING (
  public.current_user_role() = 'platform_admin' OR id = public.current_user_company_id()
);

-- Users — platform_admin all, agency staff their company, clients themselves
CREATE POLICY users_select ON public.users FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR company_id = public.current_user_company_id()
  OR id = auth.uid()
);

-- Brands — platform_admin all, agency staff their company, clients only their assigned brand
CREATE POLICY brands_select ON public.brands FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  OR (public.current_user_role() = 'client' AND assigned_client_user_id = auth.uid())
);

-- Generic company-scoped tables
CREATE POLICY adzviser_connections_select ON public.adzviser_connections FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() IN ('bod','leader'))
);

CREATE POLICY brand_ad_accounts_select ON public.brand_ad_accounts FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  OR (public.current_user_role() = 'client' AND brand_id = public.current_user_brand_id())
);

CREATE POLICY ad_data_select ON public.ad_data FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  OR (public.current_user_role() = 'client' AND brand_id = public.current_user_brand_id())
);

CREATE POLICY adzviser_sync_logs_select ON public.adzviser_sync_logs FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() IN ('bod','leader'))
);

CREATE POLICY agency_subscriptions_select ON public.agency_subscriptions FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() = 'bod')
);

CREATE POLICY invoices_select ON public.invoices FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() IN ('bod','leader'))
);

CREATE POLICY client_budgets_select ON public.client_budgets FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  OR (public.current_user_role() = 'client' AND brand_id = public.current_user_brand_id())
);

CREATE POLICY budget_topups_select ON public.budget_topups FOR SELECT USING (
  public.current_user_role() = 'platform_admin'
  OR (public.current_user_role() = 'client' AND brand_id = public.current_user_brand_id())
  OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.company_id = public.current_user_company_id())
);

CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR public.current_user_role() = 'platform_admin'
);

CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- Add INSERT/UPDATE/DELETE policies in 0003 (TODO — depends on routes)

-- ============================================================================
-- NOTE: Service-role client (lib/supabase/admin.ts) bypasses RLS.
-- Use it for trusted server-side ops (API routes, cron, webhooks).
-- ============================================================================
