-- ============================================================================
-- 0005: Add google_ads to platform CHECK constraints
-- ============================================================================
-- We support Meta Ads, Meta Insights, TikTok Ads, and now Google Ads as
-- the four ad data sources via Zernio.
-- ============================================================================

ALTER TABLE public.brand_ad_accounts DROP CONSTRAINT IF EXISTS brand_ad_accounts_platform_check;
ALTER TABLE public.brand_ad_accounts ADD CONSTRAINT brand_ad_accounts_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads', 'google_ads'));

ALTER TABLE public.adzviser_sync_logs DROP CONSTRAINT IF EXISTS adzviser_sync_logs_platform_check;
ALTER TABLE public.adzviser_sync_logs ADD CONSTRAINT adzviser_sync_logs_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads', 'google_ads'));

ALTER TABLE public.ad_data DROP CONSTRAINT IF EXISTS ad_data_platform_check;
ALTER TABLE public.ad_data ADD CONSTRAINT ad_data_platform_check
  CHECK (platform IN ('meta', 'tiktok', 'meta_ads', 'meta_insights', 'tiktok_ads', 'google_ads'));
