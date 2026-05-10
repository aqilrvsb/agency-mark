import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

/**
 * Write an audit-trail row. Best-effort: never throws — on failure, just
 * console.error and continue. The action verb is what shows up in the agency
 * /activity feed; entity_type + entity_id let the feed link back to the source.
 */
export async function logActivity(opts: {
  userId: string | null;
  companyId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      user_id: opts.userId,
      company_id: opts.companyId,
      action: opts.action,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      metadata: (opts.metadata ?? null) as Json | null,
    });
  } catch (e) {
    console.error("[activity] failed to log:", e);
  }
}
