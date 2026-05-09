-- ============================================================================
-- 0003: Widen platform enum to support FB Ads, FB Insights, TikTok Ads
-- ============================================================================
-- Original schema only allowed 'meta' / 'tiktok'. Real Adzviser data sources
-- distinguish:
--   - meta_ads       (paid Facebook campaigns via Ads Manager)
--   - meta_insights  (organic Facebook Page Insights)
--   - tiktok_ads     (TikTok Ads Manager)
--
-- Legacy values 'meta' and 'tiktok' are kept temporarily for back-compat.
-- After the app code is migrated to use the explicit values, a follow-up
-- migration can remove them.
-- ============================================================================

ALTER TABLE public.brand_ad_accounts DROP CONSTRAINT IF EXISTS brand_ad_accounts_platform_check;
ALTER TABLE public.brand_ad_accounts ADD CONSTRAINT brand_ad_accounts_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads'));

ALTER TABLE public.adzviser_sync_logs DROP CONSTRAINT IF EXISTS adzviser_sync_logs_platform_check;
ALTER TABLE public.adzviser_sync_logs ADD CONSTRAINT adzviser_sync_logs_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads'));

ALTER TABLE public.ad_data DROP CONSTRAINT IF EXISTS ad_data_platform_check;
ALTER TABLE public.ad_data ADD CONSTRAINT ad_data_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads'));
