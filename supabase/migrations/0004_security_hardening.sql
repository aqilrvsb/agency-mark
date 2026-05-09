-- ============================================================================
-- 0004: Security hardening — fix advisor warnings from 0001/0002
-- ============================================================================
-- Addresses:
--   - function_search_path_mutable (3 helper functions)
--   - rls_disabled_in_public (fb_columns, site_settings)
--   - rls_enabled_no_policy (activity_logs, alert_history, alert_rules,
--     company_column_views, custom_columns, kpi_targets, marketer_scores)
-- ============================================================================

-- 1. Lock search_path on SECURITY DEFINER helpers
ALTER FUNCTION public.current_user_role() SET search_path = public, pg_catalog;
ALTER FUNCTION public.current_user_company_id() SET search_path = public, pg_catalog;
ALTER FUNCTION public.current_user_brand_id() SET search_path = public, pg_catalog;

-- 2. Enable RLS on remaining public tables
ALTER TABLE public.fb_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- fb_columns is shared reference data — readable by any signed-in user
CREATE POLICY fb_columns_select ON public.fb_columns FOR SELECT
  USING (auth.role() = 'authenticated');

-- site_settings is platform-admin only
CREATE POLICY site_settings_select ON public.site_settings FOR SELECT
  USING (public.current_user_role() = 'platform_admin');

-- 3. Add SELECT policies for tables that had RLS enabled but no policies
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT
  USING (public.current_user_role() = 'platform_admin');

CREATE POLICY alert_history_select ON public.alert_history FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  );

CREATE POLICY alert_rules_select ON public.alert_rules FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR (company_id = public.current_user_company_id() AND public.current_user_role() IN ('bod', 'leader'))
  );

CREATE POLICY company_column_views_select ON public.company_column_views FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR company_id = public.current_user_company_id()
  );

CREATE POLICY custom_columns_select ON public.custom_columns FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR company_id = public.current_user_company_id()
  );

CREATE POLICY kpi_targets_select ON public.kpi_targets FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR company_id = public.current_user_company_id()
  );

CREATE POLICY marketer_scores_select ON public.marketer_scores FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
    OR (public.current_user_role() = 'marketer' AND marketer_id = auth.uid())
  );
