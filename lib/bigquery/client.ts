import { BigQuery } from "@google-cloud/bigquery";

let _bq: BigQuery | null = null;

/**
 * Singleton BigQuery client using service account credentials from env.
 * Used by sync workers to poll Adzviser-pushed tables.
 */
export function getBigQuery(): BigQuery {
  if (_bq) return _bq;

  const projectId = process.env.GCP_PROJECT_ID;
  const credsJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!projectId || !credsJson) {
    throw new Error("GCP_PROJECT_ID and GCP_SERVICE_ACCOUNT_JSON must be set");
  }

  const credentials = JSON.parse(credsJson);

  _bq = new BigQuery({ projectId, credentials });
  return _bq;
}

export interface AdzviserTableRef {
  dataset: string; // e.g., "agency_abc_workspace"
  table: string;   // e.g., "facebook_ads_daily"
}

/**
 * Read rows from a specific Adzviser-populated BigQuery table.
 * Filters by date range so we only fetch new data.
 */
export async function readAdzviserTable<T = Record<string, unknown>>(
  ref: AdzviserTableRef,
  options: {
    dateColumn?: string;
    startDate?: string; // ISO date YYYY-MM-DD
    endDate?: string;
    limit?: number;
  } = {}
): Promise<T[]> {
  const bq = getBigQuery();
  const { dateColumn = "date", startDate, endDate, limit = 10000 } = options;

  const conditions: string[] = [];
  if (startDate) conditions.push(`${dateColumn} >= @startDate`);
  if (endDate) conditions.push(`${dateColumn} <= @endDate`);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT *
    FROM \`${bq.projectId}.${ref.dataset}.${ref.table}\`
    ${where}
    ORDER BY ${dateColumn} DESC
    LIMIT ${limit}
  `;

  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
  });

  return rows as T[];
}
