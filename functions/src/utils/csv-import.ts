export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  parseErrors: { line: number; error: string }[];
}

import { parse } from "csv-parse/sync";

export interface ImportedProductGroup {
  key: string;
  name: string;
  slug: string;
  vendor?: string;
  productType?: string;
  productCategory?: string;
  tags: string[];
  description?: string;
  productDetails?: string;
  seoTitle?: string;
  seoDescription?: string;
  specifications?: Array<{ name: string; value: string }>;
  includedItems?: string[];
  images: string[];
  variants: any[];
  options: any[];
  published: boolean;
  relatedProducts?: string[];
  complementaryProducts?: string[];
  searchProductBoosts?: string[];
  extraAttributes?: Array<{ name: string; value: string }>;
  rowCount: number;
  rawRows: Record<string, string>[];
  errors: string[];
}

const HEADER_NORMALIZATION: Record<string, string> = {
  title: "title",
  handle: "handle",
  body_html: "body_html",
  vendor: "vendor",
  product_type: "product_type",
  type: "product_type",
  product_category: "product_category",
  tags: "tags",
  published: "published",
  status: "status",
  slug: "slug",
  variant_sku: "variant_sku",
  sku: "variant_sku",
  variant_price: "variant_price",
  price: "variant_price",
  variant_compare_at_price: "variant_compare_at_price",
  compare_at_price: "variant_compare_at_price",
  variant_inventory_qty: "variant_inventory_qty",
  inventory_quantity: "variant_inventory_qty",
  stock: "variant_inventory_qty",
  variant_barcode: "variant_barcode",
  barcode: "variant_barcode",
  variant_grams: "variant_grams",
  grams: "variant_grams",
  weight: "variant_grams",
  image_src: "image_src",
  image_url: "image_src",
  image_alt_text: "image_alt_text",
  seo_title: "seo_title",
  seo_description: "seo_description",
  meta_description: "seo_description",
  option1_name: "option1_name",
  option1_value: "option1_value",
  option1_linked_to: "option1_linked_to",
  option2_name: "option2_name",
  option2_value: "option2_value",
  option2_linked_to: "option2_linked_to",
  option3_name: "option3_name",
  option3_value: "option3_value",
  option3_linked_to: "option3_linked_to",
  variant_image: "variant_image",
  variant_image_url: "variant_image",
  variant_inventory_tracker: "variant_inventory_tracker",
  variant_inventory_policy: "variant_inventory_policy",
  variant_fulfillment_service: "variant_fulfillment_service",
  variant_requires_shipping: "variant_requires_shipping",
  variant_taxable: "variant_taxable",
  unit_price_total_measure: "unit_price_total_measure",
  unit_price_total_measure_unit: "unit_price_total_measure_unit",
  unit_price_base_measure: "unit_price_base_measure",
  unit_price_base_measure_unit: "unit_price_base_measure_unit",
  image_position: "image_position",
  gift_card: "gift_card",
  google_shopping_google_product_category:
    "google_shopping_google_product_category",
  google_shopping_gender: "google_shopping_gender",
  google_shopping_age_group: "google_shopping_age_group",
  google_shopping_mpn: "google_shopping_mpn",
  google_shopping_condition: "google_shopping_condition",
  google_shopping_custom_product: "google_shopping_custom_product",
  google_shopping_custom_label_0: "google_shopping_custom_label_0",
  google_shopping_custom_label_1: "google_shopping_custom_label_1",
  google_shopping_custom_label_2: "google_shopping_custom_label_2",
  google_shopping_custom_label_3: "google_shopping_custom_label_3",
  google_shopping_custom_label_4: "google_shopping_custom_label_4",
  related_products: "related_products",
  complementary_products: "complementary_products",
  related_products_settings: "related_products_settings",
  search_product_boosts: "search_product_boosts",
  variant_weight_unit: "variant_weight_unit",
  variant_tax_code: "variant_tax_code",
  cost_per_item: "cost_per_item",
  included_india: "included_india",
  price_india: "price_india",
  compare_at_price_india: "compare_at_price_india",
  included_international: "included_international",
  price_international: "price_international",
  compare_at_price_international: "compare_at_price_international",
  product_details: "product_details",
  included_in_box: "included_in_box",
  included_box: "included_in_box",
  included_items: "included_items",
};

const normalizeField = (field: string): string => {
  let normalized = field.trim().toLowerCase();
  normalized = normalized.replace(/\r|\n|\t/g, " ");
  normalized = normalized.replace(/google:\s*/g, "google ");
  normalized = normalized.replace(
    /\bgoogle shopping\b\s*\/?\s*/g,
    "google_shopping_",
  );
  normalized = normalized.replace(/\bproduct category\b/g, "product_category");
  normalized = normalized.replace(/\bvariant title\b/g, "variant_title");
  normalized = normalized.replace(/\bvariant image\b/g, "variant_image");
  normalized = normalized.replace(/\bvariant sku\b/g, "variant_sku");
  normalized = normalized.replace(/\bvariant price\b/g, "variant_price");
  normalized = normalized.replace(
    /\bvariant compare at price\b/g,
    "variant_compare_at_price",
  );
  normalized = normalized.replace(
    /\bvariant inventory qty\b/g,
    "variant_inventory_qty",
  );
  normalized = normalized.replace(/\bvariant barcode\b/g, "variant_barcode");
  normalized = normalized.replace(/\bvariant grams\b/g, "variant_grams");
  normalized = normalized.replace(
    /\bvariant weight unit\b/g,
    "variant_weight_unit",
  );
  normalized = normalized.replace(/\bvariant tax code\b/g, "variant_tax_code");
  normalized = normalized.replace(
    /\bvariant requires shipping\b/g,
    "variant_requires_shipping",
  );
  normalized = normalized.replace(
    /\bgoogle shopping\s*\/\s*custom label\s*([0-9])\b/g,
    "google_shopping_custom_label_$1",
  );
  normalized = normalized.replace(/\boption(\d+) name\b/g, "option$1_name");
  normalized = normalized.replace(/\boption(\d+) value\b/g, "option$1_value");
  normalized = normalized.replace(
    /\boption(\d+) linked to\b/g,
    "option$1_linked_to",
  );
  normalized = normalized.replace(/\(product\.metafields\.[^)]+\)/g, " ");
  normalized = normalized.replace(/product\.metafields\.[^\s\.]+\.?/g, " ");
  normalized = normalized.replace(/[\/\(\)\.]/g, " ");
  normalized = normalized.replace(/[^a-z0-9\s]/g, " ");
  normalized = normalized.replace(/\s+/g, " ");
  normalized = normalized.trim().replace(/\s/g, "_");
  normalized = normalized.replace(/_+/g, "_").replace(/^_|_$/g, "");

  return HEADER_NORMALIZATION[normalized] || normalized;
};

export const parseCsv = (csvText: string): CsvParseResult => {
  try {
    const records = parse(csvText, {
      columns: (headers: string[]) => headers.map(normalizeField),
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
      trim: false,
    }) as Record<string, string>[];

    const rows = records.map((record) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(record)) {
        normalized[key] = value?.toString?.().trim?.() || "";
      }
      return normalized;
    });

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows, parseErrors: [] };
  } catch (error: any) {
    return {
      headers: [],
      rows: [],
      parseErrors: [
        {
          line: 0,
          error: error?.message || "Unable to parse CSV",
        },
      ],
    };
  }
};

const getValue = (row: Record<string, string>, key: string): string => {
  return row[key] ?? "";
};

const toBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y", "published"].includes(normalized);
};

const splitCsvArray = (value: string): string[] => {
  if (!value) return [];
  return value
    .split(/[\n\r,|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseSpecificationsField = (
  value: string,
): Array<{ name: string; value: string }> => {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parsedJson = (() => {
    if (/^[\[{]/.test(trimmed)) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  })();

  if (Array.isArray(parsedJson)) {
    return parsedJson
      .map((item: any) => {
        if (typeof item === "string") {
          const [name, ...rest] = item.split(/:\s*/);
          return { name: name.trim(), value: rest.join(": ").trim() };
        }
        if (item && typeof item === "object") {
          return {
            name: item.name || item.label || item.title || "",
            value: item.value || item.description || item.detail || "",
          };
        }
        return null;
      })
      .filter((item: any) => item && item.name && item.value);
  }

  if (parsedJson && typeof parsedJson === "object") {
    return Object.entries(parsedJson).map(([name, value]) => ({
      name: String(name),
      value: String(value),
    }));
  }

  const pairs = trimmed
    .split(/[\|;\n\r]+/)
    .map((row) => row.trim())
    .filter(Boolean);
  return pairs
    .map((row) => {
      const [name, ...rest] = row.split(/:\s*/);
      return { name: name.trim(), value: rest.join(": ").trim() };
    })
    .filter((item) => item.name && item.value);
};

const parseIncludedItemsField = (value: string): string[] => {
  if (!value) return [];
  return splitCsvArray(value);
};

const buildVariantFromRow = (row: Record<string, string>): any => {
  const optionValues: Record<string, string> = {};
  [1, 2, 3].forEach((index) => {
    const optionName =
      getValue(row, `option${index}_name`) || getValue(row, `option${index}`);
    const optionValue =
      getValue(row, `option${index}_value`) || getValue(row, `option${index}`);
    if (optionName && optionValue) {
      optionValues[optionName] = optionValue;
    } else if (optionValue) {
      optionValues[`option${index}`] = optionValue;
    }
  });

  const rawPrice = getValue(row, "variant_price") || getValue(row, "price");
  const rawCompare =
    getValue(row, "variant_compare_at_price") ||
    getValue(row, "variant_price_compare_at") ||
    getValue(row, "compare_price");
  const rawStock =
    getValue(row, "variant_inventory_qty") ||
    getValue(row, "inventory_quantity") ||
    getValue(row, "stock");
  const rawWeight =
    getValue(row, "variant_grams") ||
    getValue(row, "grams") ||
    getValue(row, "weight");

  return {
    name:
      [getValue(row, "variant_title"), getValue(row, "title")]
        .filter(Boolean)
        .join(" / ") ||
      getValue(row, "variant_sku") ||
      "",
    sku: getValue(row, "variant_sku") || getValue(row, "sku") || "",
    price: parseFloat(rawPrice) || 0,
    salePrice: parseFloat(rawPrice) || 0,
    comparePrice: rawCompare ? parseFloat(rawCompare) : null,
    stock: parseInt(rawStock, 10) || 0,
    weight: parseFloat(rawWeight) || 0,
    barcode: getValue(row, "variant_barcode") || getValue(row, "barcode") || "",
    optionValues,
    images: uniqueArray(
      splitCsvArray(getValue(row, "variant_image"))
        .concat(splitCsvArray(getValue(row, "image_src")))
        .concat(splitCsvArray(getValue(row, "image_url"))),
    ),
    raw: row,
  };
};

const uniqueArray = (items: string[]): string[] => {
  return Array.from(
    new Set(items.filter((item) => item && item.trim().length > 0)),
  );
};

export const buildShopifyImportGroups = (
  parsed: CsvParseResult,
  mapping: Record<string, string> = {},
): { groups: ImportedProductGroup[]; summary: any } => {
  const groups: Record<string, ImportedProductGroup> = {};
  const skuRegistry = new Set<string>();
  const duplicateSkuRegistry = new Set<string>();

  const resolveKey = (row: Record<string, string>): string => {
    const handle = getValue(row, "handle");
    const title = getValue(row, "title");
    const slug = getValue(row, "slug");
    const fallback =
      title ||
      slug ||
      getValue(row, "variant_sku") ||
      getValue(row, "sku") ||
      "";
    return (
      handle ||
      slug ||
      fallback ||
      `row-${Math.random().toString(36).slice(2, 8)}`
    );
  };

  const resolveText = (row: Record<string, string>, keys: string[]): string => {
    for (const key of keys) {
      const value = getValue(row, key);
      if (value) return value;
    }
    return "";
  };

  const buildAttributeName = (key: string): string =>
    key
      .replace(/product_metafields_shopify_/g, "")
      .replace(/product_metafields_mm_google_shopping_/g, "")
      .replace(/google_shopping_/g, "")
      .replace(/product_metafields_/g, "")
      .replace(/_/g, " ")
      .replace(/\b(\w)/g, (match) => match.toUpperCase())
      .trim();

  const extractAdditionalAttributes = (
    row: Record<string, string>,
  ): Array<{ name: string; value: string }> => {
    const skipKeys = new Set([
      "handle",
      "title",
      "body_html",
      "vendor",
      "product_category",
      "product_type",
      "type",
      "tags",
      "published",
      "status",
      "slug",
      "variant_sku",
      "variant_price",
      "price",
      "variant_compare_at_price",
      "compare_at_price",
      "variant_inventory_qty",
      "inventory_quantity",
      "stock",
      "variant_barcode",
      "barcode",
      "variant_grams",
      "grams",
      "weight",
      "image_src",
      "image_url",
      "variant_image",
      "image_alt_text",
      "seo_title",
      "seo_description",
      "meta_description",
      "option1_name",
      "option1_value",
      "option1_linked_to",
      "option2_name",
      "option2_value",
      "option2_linked_to",
      "option3_name",
      "option3_value",
      "option3_linked_to",
      "variant_title",
      "variant_inventory_tracker",
      "variant_inventory_policy",
      "variant_fulfillment_service",
      "variant_requires_shipping",
      "variant_taxable",
      "unit_price_total_measure",
      "unit_price_total_measure_unit",
      "unit_price_base_measure",
      "unit_price_base_measure_unit",
      "image_position",
      "gift_card",
      "related_products",
      "complementary_products",
      "related_products_settings",
      "search_product_boosts",
      "google_shopping_google_product_category",
      "google_shopping_gender",
      "google_shopping_age_group",
      "google_shopping_mpn",
      "google_shopping_condition",
      "google_shopping_custom_product",
      "google_shopping_custom_label_0",
      "google_shopping_custom_label_1",
      "google_shopping_custom_label_2",
      "google_shopping_custom_label_3",
      "google_shopping_custom_label_4",
      "variant_weight_unit",
      "variant_tax_code",
      "cost_per_item",
      "included_india",
      "price_india",
      "compare_at_price_india",
      "included_international",
      "price_international",
      "compare_at_price_international",
    ]);

    return Object.entries(row).reduce(
      (attributes, [key, value]) => {
        if (!value || skipKeys.has(key)) return attributes;
        attributes.push({ name: buildAttributeName(key), value });
        return attributes;
      },
      [] as Array<{ name: string; value: string }>,
    );
  };

  for (const row of parsed.rows) {
    const key = resolveKey(row);
    const title = resolveText(row, ["title", "handle"]);
    const vendor = resolveText(row, ["vendor"]);
    const productCategory = resolveText(row, ["product_category"]);
    const productType = resolveText(row, ["product_type", "type"]);
    const published =
      toBoolean(getValue(row, "published")) ||
      toBoolean(getValue(row, "status"));
    const description = resolveText(row, ["body_html", "description"]);
    const seoTitle = resolveText(row, ["seo_title"]);
    const seoDescription = resolveText(row, [
      "seo_description",
      "meta_description",
    ]);
    const tags = splitCsvArray(resolveText(row, ["tags"]));
    const productDetails = resolveText(row, [
      "product_details",
      "product details",
      "details",
    ]);
    const specifications = parseSpecificationsField(
      resolveText(row, ["specifications", "product_specifications"]),
    );
    const includedItems = parseIncludedItemsField(
      resolveText(row, ["included_items", "included_in_box", "included box"]),
    );
    const imageUrls = uniqueArray([
      ...splitCsvArray(getValue(row, "image_src")),
      ...splitCsvArray(getValue(row, "image_url")),
      ...splitCsvArray(getValue(row, "variant_image")),
    ]);
    const variant = buildVariantFromRow(row);
    const relatedProducts = splitCsvArray(getValue(row, "related_products"));
    const complementaryProducts = splitCsvArray(
      getValue(row, "complementary_products"),
    );
    const searchProductBoosts = splitCsvArray(
      getValue(row, "search_product_boosts"),
    );
    const extraAttributes = extractAdditionalAttributes(row);

    const duplicateCheck = variant.sku ? variant.sku : undefined;
    if (duplicateCheck) {
      if (skuRegistry.has(duplicateCheck)) {
        duplicateSkuRegistry.add(duplicateCheck);
      } else {
        skuRegistry.add(duplicateCheck);
      }
    }

    if (!groups[key]) {
      groups[key] = {
        key,
        name: title || key,
        slug:
          getValue(row, "handle") ||
          getValue(row, "slug") ||
          title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        vendor,
        productType,
        productCategory,
        tags,
        description,
        seoTitle,
        seoDescription,
        images: imageUrls,
        variants: [],
        options: [],
        published,
        relatedProducts,
        complementaryProducts,
        searchProductBoosts,
        extraAttributes,
        productDetails,
        specifications,
        includedItems,
        rowCount: 0,
        rawRows: [],
        errors: [],
      };
    }

    const product = groups[key];
    product.rowCount += 1;
    product.rawRows.push(row);

    if (variant.sku && duplicateSkuRegistry.has(variant.sku)) {
      product.errors.push(`Duplicate SKU in file: ${variant.sku}`);
    }

    if (variant.images.length > 0) {
      product.images.push(...variant.images);
    }

    product.variants.push({
      ...variant,
      images: uniqueArray(variant.images),
    });
  }

  const result = Object.values(groups).map((product) => {
    const uniqueVariantKeys = new Set<string>();
    const variants = product.variants.filter((variant, index) => {
      const variantKey =
        variant.sku ||
        variant.name ||
        JSON.stringify(variant.optionValues || {}) ||
        `${product.key}-${index}`;
      if (!variantKey || !variantKey.toString().trim()) return false;
      if (uniqueVariantKeys.has(variantKey)) return false;
      uniqueVariantKeys.add(variantKey);
      return true;
    });

    const normalizedErrors = Array.from(new Set(product.errors));
    if (!product.name || variants.length === 0) {
      if (
        !normalizedErrors.includes("Missing required fields: title or variants")
      ) {
        normalizedErrors.push("Missing required fields: title or variants");
      }
    }

    return {
      ...product,
      variants,
      errors: normalizedErrors,
      images: uniqueArray(product.images),
      options: Array.from(
        new Set(
          variants.flatMap((variant) =>
            Object.keys(variant.optionValues || {}),
          ),
        ),
      ).map((optionName) => ({
        name: optionName,
        values: uniqueArray(
          variants
            .map((variant) => variant.optionValues?.[optionName] || "")
            .filter(Boolean),
        ),
      })),
    };
  });

  const allErrors = result.reduce<string[]>(
    (errors, product) => [...errors, ...product.errors],
    [],
  );

  const invalidGroups = result.filter(
    (product) => !product.name || product.variants.length === 0,
  );

  return {
    groups: result,
    summary: {
      totalProducts: result.length,
      totalVariants: result.reduce(
        (count, product) => count + product.variants.length,
        0,
      ),
      productCount: result.length,
      variantCount: result.reduce(
        (count, product) => count + product.variants.length,
        0,
      ),
      invalidRows: invalidGroups.length,
      duplicateSkuCount: duplicateSkuRegistry.size,
      missingFields: invalidGroups.length,
      totalRows: parsed.rows.length,
      errors: allErrors,
    },
  };
};
