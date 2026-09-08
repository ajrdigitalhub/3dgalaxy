import { Category } from '../../../services/datastore';

/**
 * Safely normalizes category IDs from string, number, or object representations.
 */
export function normalizeCategoryId(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'object') {
    if (val.id !== undefined && val.id !== null) return normalizeCategoryId(val.id);
    if (val.categoryId !== undefined && val.categoryId !== null) return normalizeCategoryId(val.categoryId);
    if (val.category_id !== undefined && val.category_id !== null) return normalizeCategoryId(val.category_id);
    if (val.category !== undefined && val.category !== null) return normalizeCategoryId(val.category);
    if (val._id !== undefined && val._id !== null) return normalizeCategoryId(val._id);
  }
  return '';
}

/**
 * Extracts and normalizes selected category IDs and primary category ID from any API response or Product object.
 * Reconciles with available categories if provided (resolving IDs, slugs, or case differences).
 */
export function extractNormalizedCategoryIds(source: any, availableCategories?: Category[]): { categoryIds: string[]; primaryCategoryId: string | null } {
  if (!source) return { categoryIds: [], primaryCategoryId: null };
  const p = source.product || source;
  const rawList: any[] = [];

  const collect = (item: any) => {
    if (item === null || item === undefined) return;
    if (Array.isArray(item)) {
      item.forEach(i => collect(i));
    } else {
      rawList.push(item);
    }
  };

  // Collect from all possible fields in API response or product object
  collect(p.categoryIds);
  collect(p.category_ids);
  collect(p.categories);
  collect(p.productCategories);
  collect(source.categoryIds);
  collect(source.category_ids);
  collect(source.categories);

  // If still empty, fall back to single category references
  if (rawList.length === 0) {
    collect(p.categoryId);
    collect(p.category_id);
    collect(p.category);
    collect(source.categoryId);
    collect(source.category_id);
  }

  const normalizedSet = new Set<string>();
  let primaryId: string | null = null;

  // Determine primary category if explicitly marked
  for (const item of rawList) {
    if (typeof item === 'object' && item !== null && (item.isPrimary || item.is_primary)) {
      const nid = normalizeCategoryId(item);
      if (nid) primaryId = nid;
    }
  }

  if (!primaryId) {
    const rawPrimary = p.primaryCategoryId || p.primary_category_id || p.primaryCategory || p.categoryId || p.category_id;
    const nid = normalizeCategoryId(rawPrimary);
    if (nid) primaryId = nid;
  }

  // Normalize each item into an ID string
  for (const item of rawList) {
    const nid = normalizeCategoryId(item);
    if (nid) {
      normalizedSet.add(nid);
    }
  }

  // If availableCategories are provided, also match by slug or name if the raw hint was a slug/name or if ID matches
  if (availableCategories && availableCategories.length > 0) {
    const finalSet = new Set<string>();

    const catMap = new Map<string, Category>();
    const slugMap = new Map<string, Category>();
    const nameMap = new Map<string, Category>();

    for (const cat of availableCategories) {
      const cId = normalizeCategoryId(cat.id);
      if (cId) {
        catMap.set(cId, cat);
        catMap.set(cId.toLowerCase(), cat);
      }
      if (cat.slug) {
        slugMap.set(cat.slug.toLowerCase().trim(), cat);
      }
      if (cat.name) {
        nameMap.set(cat.name.toLowerCase().trim(), cat);
      }
    }

    for (const rawId of normalizedSet) {
      const rawLower = rawId.toLowerCase();
      // 1. Direct ID match
      if (catMap.has(rawId)) {
        finalSet.add(catMap.get(rawId)!.id);
      } else if (catMap.has(rawLower)) {
        finalSet.add(catMap.get(rawLower)!.id);
      } else if (slugMap.has(rawLower)) {
        // 2. Slug match
        finalSet.add(slugMap.get(rawLower)!.id);
      } else if (nameMap.has(rawLower)) {
        // 3. Name match
        finalSet.add(nameMap.get(rawLower)!.id);
      } else {
        // Keep raw ID
        finalSet.add(rawId);
      }
    }

    if (primaryId) {
      const pLower = primaryId.toLowerCase();
      if (catMap.has(primaryId)) {
        primaryId = catMap.get(primaryId)!.id;
      } else if (catMap.has(pLower)) {
        primaryId = catMap.get(pLower)!.id;
      } else if (slugMap.has(pLower)) {
        primaryId = slugMap.get(pLower)!.id;
      } else if (nameMap.has(pLower)) {
        primaryId = nameMap.get(pLower)!.id;
      }
    }

    return {
      categoryIds: Array.from(finalSet),
      primaryCategoryId: primaryId || (finalSet.size > 0 ? Array.from(finalSet)[0] : null)
    };
  }

  const resIds = Array.from(normalizedSet);
  return {
    categoryIds: resIds,
    primaryCategoryId: primaryId || (resIds.length > 0 ? resIds[0] : null)
  };
}
