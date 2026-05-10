/**
 * Unified catalog accessor — picks the right per-platform catalog
 * and exposes lookup utilities used by the template builder UI and
 * the report renderer.
 */

import { metaCatalog } from "./catalog-meta";
import { tiktokCatalog } from "./catalog-tiktok";
import { googleCatalog } from "./catalog-google";
import {
  type CatalogField,
  type Level,
  type Platform,
  type PlatformCatalog,
  type Tab,
} from "./catalog-types";

const CATALOGS: Record<Platform, PlatformCatalog> = {
  meta: metaCatalog,
  tiktok: tiktokCatalog,
  google: googleCatalog,
};

export function getCatalog(platform: Platform): PlatformCatalog {
  return CATALOGS[platform];
}

export function getDefaultFieldIds(platform: Platform, level: Level): string[] {
  return CATALOGS[platform].fields
    .filter((f) => f.isDefault && (f.validLevels === undefined || f.validLevels.includes(level)))
    .map((f) => f.id);
}

export function getField(platform: Platform, id: string): CatalogField | undefined {
  return CATALOGS[platform].fields.find((f) => f.id === id);
}

/** Group fields by tab → category → group, filtered by level. */
export function groupFieldsByTab(platform: Platform, level: Level) {
  const cat = CATALOGS[platform];
  const result: Record<
    Tab,
    {
      category: string;
      groups: { name: string; fields: CatalogField[] }[];
    }[]
  > = {
    key_metrics: [],
    tracking: [],
    ad_settings: [],
    advanced: [],
    custom: [],
  };

  for (const tabSpec of cat.tabs) {
    const tabCats = cat.categories.filter((c) => c.tab === tabSpec.id);
    for (const c of tabCats) {
      const groupsOut: { name: string; fields: CatalogField[] }[] = [];
      for (const groupName of c.groups) {
        const fields = cat.fields.filter(
          (f) =>
            f.tab === tabSpec.id &&
            f.category === c.name &&
            f.group === groupName &&
            (f.validLevels === undefined || f.validLevels.includes(level))
        );
        if (fields.length > 0) groupsOut.push({ name: groupName, fields });
      }
      if (groupsOut.length > 0) {
        result[tabSpec.id].push({ category: c.name, groups: groupsOut });
      }
    }
  }
  return result;
}

export type { CatalogField, Level, Platform, PlatformCatalog, Tab };
