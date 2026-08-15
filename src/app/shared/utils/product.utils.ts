/**
 * Utility to check if a product has variants, bundle options, or customizable option tiers.
 */
export function hasProductVariants(p: any): boolean {
  if (!p) return false;

  // Direct boolean flags
  if (p.hasVariants === true || p.has_variants === true) return true;
  if (p.isBundle === true || p.is_bundle === true) return true;
  if (p.selectionMode === 'bundle' || p.displayType === 'bundle-builder') return true;

  // Array of variants check
  if (Array.isArray(p.variants) && p.variants.length > 0) return true;
  if (typeof p.variants === 'string' && p.variants.trim().length > 2 && p.variants.trim() !== '[]') return true;

  // Options / VariantOptions check
  const opts = p.options || p.variantOptions || p.variant_options || p.optionsData;
  if (Array.isArray(opts) && opts.length > 0) return true;
  if (typeof opts === 'string' && opts.trim().length > 2 && opts.trim() !== '[]') return true;

  // Bundle tiers / Bundle products check
  if (Array.isArray(p.bundleTiers) && p.bundleTiers.length > 0) return true;
  if (Array.isArray(p.bundle_tiers) && p.bundle_tiers.length > 0) return true;
  if (Array.isArray(p.bundleProducts) && p.bundleProducts.length > 0) return true;
  if (Array.isArray(p.bundle_products) && p.bundle_products.length > 0) return true;
  if (p.bundleName || p.bundle_name) return true;

  return false;
}
