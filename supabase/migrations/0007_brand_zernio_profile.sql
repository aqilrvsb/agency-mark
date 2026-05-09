-- ============================================================================
-- 0007: Add zernio_profile_id to brands
-- ============================================================================
-- Each brand gets its own Zernio Profile (Zernio's workspace-like grouping).
-- We create the profile on demand the first time a client clicks "Connect"
-- on any platform tile.
-- ============================================================================

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS zernio_profile_id text;
