-- ============================================================================
-- 0015: Rename brands.zernio_profile_id → brands.peningads_profile_id
-- ============================================================================
-- Part of the Peningads rebrand. The third-party host stays at zernio.com but
-- every reference inside our own codebase (column names, identifiers, prose)
-- flips to "Peningads". This migration handles the only Zernio-named DB column.
-- ============================================================================

ALTER TABLE public.brands RENAME COLUMN zernio_profile_id TO peningads_profile_id;
