-- ============================================================================
-- 0006: brand_notes — internal notes per client (brand)
-- ============================================================================
-- Visible to agency staff; not exposed in client portal.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brand_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_notes_brand ON public.brand_notes (brand_id, created_at DESC);

ALTER TABLE public.brand_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_notes_select ON public.brand_notes FOR SELECT
  USING (
    public.current_user_role() = 'platform_admin'
    OR (company_id = public.current_user_company_id() AND public.current_user_role() <> 'client')
  );
