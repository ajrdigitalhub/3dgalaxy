import { Category } from '../../../services/datastore';

/**
 * Safely normalizes category IDs from string, number, or object representations.
 */
export function normalizeCategoryId(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return '';
    return trimmed;
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    return String(val).trim();
  }
  if (typeof val === 'object') {
    if (val.id !== undefined && val.id !== null) return normalizeCategoryId(val.id);
    if (val.categoryId !== undefined && val.categoryId !== null) return normalizeCategoryId(val.categoryId);
    if (val.category_id !== undefined && val.category_id !== null) return normalizeCategoryId(val.category_id);
    if (val._id !== undefined && val._id !== null) return normalizeCategoryId(val._id);
    if (val.category !== undefined && val.category !== null) return normalizeCategoryId(val.category);
    if (val.catId !== undefined && val.catId !== null) return normalizeCategoryId(val.catId);
    if (val.cat_id !== undefined && val.cat_id !== null) return normalizeCategoryId(val.cat_id);
    if (val.value !== undefined && val.value !== null) return normalizeCategoryId(val.value);
    if (val.slug !== undefined && val.slug !== null) return normalizeCategoryId(val.slug);
  }
  return '';
}

/**
 * Extracts and normalizes selected category IDs and primary category ID from any API response, product object, array, or string.
 * Reconciles with available categories if provided (resolving IDs, slugs, or case differences).
 */
export function extractNormalizedCategoryIds(
  source: any,
  availableCategories?: Category[]
): { categoryIds: string[]; primaryCategoryId: string | null } {
  if (source === null || source === undefined) {
    return { categoryIds: [], primaryCategoryId: null };
  }

  const rawList: any[] = [];

  const collect = (item: any) => {
    if (item === null || item === undefined) return;
    if (Array.isArray(item)) {
      item.forEach(i => collect(i));
    } else if (typeof item === 'string' && (item.startsWith('[') || item.includes(','))) {
      try {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          parsed.forEach(i => collect(i));
          return;
        }
      } catch {}
      // Comma-separated fallback
      if (item.includes(',')) {
        item.split(',').map(s => s.trim()).filter(Boolean).forEach(s => rawList.push(s));
        return;
      }
      rawList.push(item);
    } else {
      rawList.push(item);
    }
  };

  // If source itself is an array:
  if (Array.isArray(source)) {
    collect(source);
  } else if (typeof source === 'string' || typeof source === 'number') {
    collect(source);
  } else if (typeof source === 'object') {
    const p = source.product || source;

    // Collect from all potential fields in nested product or root source
    collect(p.categoryIds);
    collect(p.category_ids);
    collect(p.categories);
    collect(p.productCategories);
    collect(p.product_categories);

    if (source !== p) {
      collect(source.categoryIds);
      collect(source.category_ids);
      collect(source.categories);
      collect(source.productCategories);
      collect(source.product_categories);
    }

    // Single category fallbacks if still empty
    if (rawList.length === 0) {
      collect(p.categoryId);
      collect(p.category_id);
      collect(p.category);
      collect(p.primaryCategoryId);
      collect(p.primary_category_id);
      collect(p.primaryCategory);
      if (source !== p) {
        collect(source.categoryId);
        collect(source.category_id);
        collect(source.category);
        collect(source.primaryCategoryId);
        collect(source.primary_category_id);
        collect(source.primaryCategory);
      }
    }
  }

  const normalizedSet = new Set<string>();
  let primaryId: string | null = null;

  // 1. Determine primary category if explicitly marked in item objects
  for (const item of rawList) {
    if (typeof item === 'object' && item !== null) {
      if (item.isPrimary || item.is_primary || item.primary) {
        const nid = normalizeCategoryId(item);
        if (nid) primaryId = nid;
      }
    }
  }

  // 2. Fallback primary category from source properties
  if (!primaryId && typeof source === 'object' && source !== null) {
    const p = source.product || source;
    const rawPrimary = p.primaryCategoryId || p.primary_category_id || p.primaryCategory || p.categoryId || p.category_id || source.primaryCategoryId || source.primary_category_id || source.primaryCategory || source.categoryId || source.category_id;
    const nid = normalizeCategoryId(rawPrimary);
    if (nid) primaryId = nid;
  }

  // 3. Normalize each item into an ID string
  for (const item of rawList) {
    const nid = normalizeCategoryId(item);
    if (nid) {
      normalizedSet.add(nid);
    }
  }

  // 4. If available categories are provided, resolve against canonical category IDs
  if (availableCategories && availableCategories.length > 0) {
    const finalSet = new Set<string>();

    const idMap = new Map<string, string>();     // cat.id -> canonical cat.id
    const slugMap = new Map<string, string>();   // slug -> canonical cat.id
    const nameMap = new Map<string, string>();   // name -> canonical cat.id

    for (const cat of availableCategories) {
      if (!cat) continue;
      const canonicalId = normalizeCategoryId(cat.id);
      if (canonicalId) {
        idMap.set(canonicalId, canonicalId);
        idMap.set(canonicalId.toLowerCase(), canonicalId);
      }
      if (cat.slug) {
        const s = String(cat.slug).trim().toLowerCase();
        if (s && canonicalId) slugMap.set(s, canonicalId);
      }
      if (cat.name) {
        const n = String(cat.name).trim().toLowerCase();
        if (n && canonicalId) nameMap.set(n, canonicalId);
      }
    }

    for (const rawId of normalizedSet) {
      const rawLower = rawId.toLowerCase();
      if (idMap.has(rawId)) {
        finalSet.add(idMap.get(rawId)!);
      } else if (idMap.has(rawLower)) {
        finalSet.add(idMap.get(rawLower)!);
      } else if (slugMap.has(rawLower)) {
        finalSet.add(slugMap.get(rawLower)!);
      } else if (nameMap.has(rawLower)) {
        finalSet.add(nameMap.get(rawLower)!);
      } else {
        finalSet.add(rawId);
      }
    }

    if (primaryId) {
      const pLower = primaryId.toLowerCase();
      if (idMap.has(primaryId)) {
        primaryId = idMap.get(primaryId)!;
      } else if (idMap.has(pLower)) {
        primaryId = idMap.get(pLower)!;
      } else if (slugMap.has(pLower)) {
        primaryId = slugMap.get(pLower)!;
      } else if (nameMap.has(pLower)) {
        primaryId = nameMap.get(pLower)!;
      }
    }

    const resList = Array.from(finalSet);
    return {
      categoryIds: resList,
      primaryCategoryId: primaryId || (resList.length > 0 ? resList[0] : null)
    };
  }

  const resList = Array.from(normalizedSet);
  return {
    categoryIds: resList,
    primaryCategoryId: primaryId || (resList.length > 0 ? resList[0] : null)
  };
}
