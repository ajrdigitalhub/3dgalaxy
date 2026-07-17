import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import prisma from "../config/database";
import { FirebaseStorageService } from "../modules/storage/firebase-storage.service";
import { parseCsv, buildShopifyImportGroups } from "../utils/csv-import";
import { clearProductCache } from "./product";

const MAX_BATCH_SIZE = 5;
const IMPORT_IMAGE_DIR = "product-import";

const getTextFromBuffer = (
  buffer: Buffer,
  encoding: BufferEncoding = "utf8",
): string => buffer.toString(encoding);

const downloadImageBuffer = async (url: string): Promise<Buffer> => {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxContentLength: 20 * 1024 * 1024,
  });
  return Buffer.from(response.data);
};

const guessMimeType = (url: string): string => {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
};

const safeParseObject = (value: any): any => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

const normalizeSlug = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value?.trim?.() || "",
  );
};

const resolveOrCreateCategory = async (
  label: string | undefined,
  tx: any,
  cache: Map<string, string>,
): Promise<string | null> => {
  if (!label) return null;
  const normalized = label.trim();
  if (!normalized) return null;

  if (cache.has(normalized)) {
    return cache.get(normalized)!;
  }

  const slug =
    normalizeSlug(normalized) ||
    `category-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  let category: any = null;

  if (isUuid(normalized)) {
    category = await tx.category.findUnique({ where: { id: normalized } });
  }

  if (!category) {
    category = await tx.category.findFirst({
      where: {
        OR: [{ slug }, { name: normalized }],
      },
    });
  }

  if (!category) {
    category = await tx.category.create({
      data: {
        name: normalized,
        slug,
        description: null,
        isActive: true,
      },
    });
  }

  cache.set(normalized, category.id);
  cache.set(slug, category.id);
  return category.id;
};

const resolveOrCreateBrand = async (
  label: string | undefined,
  tx: any,
  cache: Map<string, string>,
): Promise<string | null> => {
  if (!label) return null;
  const normalized = label.trim();
  if (!normalized) return null;

  if (cache.has(normalized)) {
    return cache.get(normalized)!;
  }

  const slug =
    normalizeSlug(normalized) ||
    `brand-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  let brand: any = null;

  if (isUuid(normalized)) {
    brand = await tx.brand.findUnique({ where: { id: normalized } });
  }

  if (!brand) {
    brand = await tx.brand.findFirst({
      where: {
        OR: [{ slug }, { name: normalized }],
      },
    });
  }

  if (!brand) {
    brand = await tx.brand.create({
      data: {
        name: normalized,
        slug,
        description: null,
      },
    });
  }

  cache.set(normalized, brand.id);
  cache.set(slug, brand.id);
  return brand.id;
};

const generateSeoKeywords = (group: any): string[] => {
  const keywords = new Set<string>();
  const add = (value: any) => {
    if (!value) return;
    const text = String(value).trim();
    if (!text) return;
    text
      .split(/[\s,;]+/)
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean)
      .forEach((term) => keywords.add(term));
  };

  add(group.name);
  add(group.vendor);
  add(group.productType);
  add(group.description);
  add(group.seoTitle);
  add(group.seoDescription);
  if (Array.isArray(group.tags)) {
    group.tags.forEach(add);
  }

  return Array.from(keywords).slice(0, 50);
};

const ensureTemporaryFileDeleted = async (filepath: string) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err: any) {
    console.warn("Failed to delete temporary file:", err.message || err);
  }
};

const parseCsvFile = async (filepath: string) => {
  const raw = fs.readFileSync(filepath, "utf8");
  return parseCsv(raw);
};

const uploadRemoteImage = async (url: string): Promise<string | null> => {
  try {
    const buffer = await downloadImageBuffer(url);
    const mimeType = guessMimeType(url);
    const extension = path.extname(new URL(url).pathname) || ".jpg";
    const destination = `${IMPORT_IMAGE_DIR}/${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    // Guard the upload with a timeout so a single stuck upload doesn't block the whole import
    const uploadPromise = FirebaseStorageService.uploadFile(
      buffer,
      destination,
      mimeType,
    );
    const timeoutMs = 30000;
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Upload timeout")), timeoutMs),
    );
    return (await Promise.race([uploadPromise, timeoutPromise])) as
      | string
      | null;
  } catch (err: any) {
    console.warn(`Image upload failed for URL '${url}':`, err.message || err);
    return null;
  }
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const current = index;
        index += 1;
        results[current] = await mapper(items[current]);
      }
    },
  );

  await Promise.all(workers);
  return results;
};

const uploadImageUrls = async (urls: string[]) => {
  const cleanedUrls = uniqueArray(
    urls.map((url) => url.trim()).filter(Boolean),
  );
  const uploads = await Promise.allSettled(
    cleanedUrls.map((url) => uploadRemoteImage(url)),
  );
  return uploads
    .filter(
      (entry): entry is PromiseFulfilledResult<string> =>
        entry.status === "fulfilled" && Boolean(entry.value),
    )
    .map((entry) => entry.value);
};

const collectVariantImageUrls = (variant: any): string[] => {
  const sources = [
    ...(Array.isArray(variant?.variantImages) ? variant.variantImages : []),
    ...(Array.isArray(variant?.images) ? variant.images : []),
    ...(Array.isArray(variant?.uploadedImages) ? variant.uploadedImages : []),
  ];
  return uniqueArray(
    sources
      .map((image: any) =>
        typeof image === "string" ? image : image?.url || image?.imageUrl || "",
      )
      .map((image) => image.trim())
      .filter(Boolean),
  );
};

const prepareGroupImageUploads = async (group: any) => {
  group.uploadedImages = await uploadImageUrls(group.images || []);

  await mapWithConcurrency(group.variants || [], 4, async (variant: any) => {
    const rawVariantImages = collectVariantImageUrls(variant);
    variant.uploadedImages = await uploadImageUrls(rawVariantImages);
    return variant;
  });
};

export const buildProductPayload = async (
  group: any,
  tx: any,
  brandCache: Map<string, string>,
  categoryCache: Map<string, string>,
) => {
  const variantSkus = group.variants
    .map((variant: any) => variant.sku)
    .filter(Boolean);
  const sku = variantSkus[0] || group.slug || group.key;

  const prices = group.variants.map((variant: any) => variant.price || 0);
  const stockQtys = group.variants.map((variant: any) => variant.stock || 0);

  const productImages = uniqueArray(
    (group.uploadedImages || group.images || []).filter(Boolean),
  );

  const variantItems = [];
  for (const variant of group.variants) {
    const images = uniqueArray(
      (variant.uploadedImages ||
        variant.variantImages ||
        variant.images ||
        [])
        .map((img: string) => img.trim())
        .filter(Boolean),
    );

    variantItems.push({
      name: variant.name || sku,
      sku: variant.sku || `${sku}-${variant.name || "default"}`,
      price: variant.price || 0,
      salePrice:
        variant.salePrice !== undefined && variant.salePrice !== null
          ? variant.salePrice
          : variant.price || 0,
      stock: variant.stock || 0,
      weight: variant.weight || 0,
      barcode: variant.barcode || "",
      variantImages: images,
      optionValues: variant.optionValues || {},
    });
  }

  const categoryId = await resolveOrCreateCategory(
    group.productCategory || group.productType || group.product_type,
    tx,
    categoryCache,
  );
  const brandId = await resolveOrCreateBrand(
    group.vendor || group.vendor_name,
    tx,
    brandCache,
  );

  const attributeItems = [
    ...(group.extraAttributes || []),
    ...(group.tags || []).map((tag: string) => ({ name: tag, value: tag })),
  ];

  return {
    name: group.name || sku,
    slug:
      group.slug ||
      group.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      sku,
    sku,
    description: group.productDetails || group.description || "",
    short_description: group.description || "",
    mrp: Math.max(...prices, 0),
    price: prices[0] || 0,
    salePrice: prices[0] || 0,
    dealerPrice: null,
    stock: stockQtys.reduce((sum: number, qty: number) => sum + qty, 0),
    categoryId,
    brandId,
    seoTitle: group.seoTitle || "",
    seoDescription: group.seoDescription || "",
    seoKeywords: generateSeoKeywords(group),
    images: productImages,
    variants: variantItems,
    specifications: group.specifications || [],
    downloads: [],
    features: [],
    faqs: [],
    warranty: {},
    shipping: {},
    relatedProducts: group.relatedProducts || [],
    bundleProducts: [],
    recommendedFilaments: [],
    includedItems: group.includedItems || [],
    attributes: attributeItems,
    options: group.options || [],
    status: group.published ? "active" : "draft",
  };
};

const uniqueArray = (items: any[]): any[] => {
  return Array.from(
    new Set(
      items.filter(
        (item) =>
          item !== null && item !== undefined && `${item}`.trim().length > 0,
      ),
    ),
  );
};

const ensureUniqueVariantSku = async (
  tx: any,
  desiredSku: string | undefined,
  fallbackPrefix = "sku",
  existingSkus = new Set<string>(),
) => {
  let base = (desiredSku || "").toString().trim();
  if (!base) base = `${fallbackPrefix}-${Date.now()}`;

  const normalizedBase = base;
  const candidateSkus = new Set<string>(existingSkus);

  const baseExists = await tx.productVariant.findUnique({
    where: { sku: normalizedBase },
  });
  if (!baseExists && !candidateSkus.has(normalizedBase)) {
    existingSkus.add(normalizedBase);
    return normalizedBase;
  }

  candidateSkus.add(normalizedBase);

  const foundVariants = await tx.productVariant.findMany({
    where: {
      sku: { startsWith: `${normalizedBase}-` },
    },
    select: { sku: true },
  });

  for (const variant of foundVariants) {
    candidateSkus.add(variant.sku);
  }

  const maxAttempts = 1000;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const sku = `${normalizedBase}-${attempt}`;
    if (!candidateSkus.has(sku)) {
      existingSkus.add(sku);
      return sku;
    }
  }

  throw new Error(
    `Unable to generate unique SKU after ${maxAttempts} attempts`,
  );
};

const ensureUniqueProductSlug = async (
  tx: any,
  desiredSlug: string,
  importedSlugSet: Set<string>,
  existingProductId?: string,
) => {
  const baseSlug = normalizeSlug(desiredSlug || "") || `product-${Date.now()}`;
  const candidateSlugs = new Set<string>(importedSlugSet);

  const existingProducts = await tx.product.findMany({
    where: {
      slug: { startsWith: `${baseSlug}` },
    },
    select: { id: true, slug: true },
  });

  for (const product of existingProducts) {
    if (existingProductId && product.id === existingProductId) {
      continue;
    }
    candidateSlugs.add(product.slug);
  }

  if (!candidateSlugs.has(baseSlug)) {
    importedSlugSet.add(baseSlug);
    return baseSlug;
  }

  for (let attempt = 1; attempt <= 1000; attempt += 1) {
    const candidate = `${baseSlug}-${attempt}`;
    if (!candidateSlugs.has(candidate)) {
      importedSlugSet.add(candidate);
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique slug for the imported product.");
};

const prepareErrorCsv = (errors: any[]): string => {
  const header = ["rowNumber", "sku", "reason"];
  const rows = errors.map((error) =>
    [error.rowNumber || "", error.sku || "", error.reason || ""]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
};

const buildSeoKeywordsForProduct = (product: any): string[] => {
  const keywords = new Set<string>();
  const add = (value: any) => {
    if (!value) return;
    const text = String(value).trim();
    if (!text) return;
    text
      .split(/[\s,;]+/)
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean)
      .forEach((term) => keywords.add(term));
  };

  add(product.name);
  add(product.description);
  add(product.shortDescription);
  add(product.brand?.name);
  add(product.category?.name);
  if (Array.isArray(product.attributes)) {
    product.attributes.forEach((attr: any) => add(attr.name || attr));
  }
  if (Array.isArray(product.options)) {
    product.options.forEach((opt: any) => add(opt.name || opt));
  }

  return Array.from(keywords).slice(0, 50);
};

const runPostImportProcessor = async (productIds: string[]) => {
  if (!productIds || productIds.length === 0) {
    return {
      processedProducts: 0,
      seoKeywordsUpdated: 0,
      relatedProductsAssigned: 0,
    };
  }

  const importedProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    include: { brand: true, category: true },
  });

  let seoKeywordsUpdated = 0;
  let relatedProductsAssigned = 0;

  for (const product of importedProducts) {
    const existingSeo = safeParseObject(product.seo || {});
    const newKeywords = buildSeoKeywordsForProduct(product);
    const mergedKeywords = Array.from(
      new Set([...(existingSeo.keywords || []), ...newKeywords]),
    ).slice(0, 50);

    const effectiveRelatedProducts = Array.isArray(product.relatedProducts)
      ? product.relatedProducts
      : [];

    const updateData: any = {};

    if (
      !Array.isArray(existingSeo.keywords) ||
      JSON.stringify(existingSeo.keywords) !== JSON.stringify(mergedKeywords)
    ) {
      updateData.seo = {
        ...existingSeo,
        keywords: mergedKeywords,
      };
      seoKeywordsUpdated += 1;
    }

    if (effectiveRelatedProducts.length === 0 && product.categoryId) {
      const related = await prisma.product.findMany({
        where: {
          id: { not: product.id },
          categoryId: product.categoryId,
          isActive: true,
          deletedAt: null,
        },
        take: 3,
        select: { id: true },
      });
      if (related.length > 0) {
        updateData.relatedProducts = related.map((item) => item.id);
        relatedProductsAssigned += 1;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });
    }
  }

  return {
    processedProducts: importedProducts.length,
    seoKeywordsUpdated,
    relatedProductsAssigned,
  };
};

const createImportHistory = async (data: any) => {
  const prismaAny = prisma as any;
  return await prismaAny.productImportHistory.create({ data });
};

const getImportHistoryList = async () => {
  const prismaAny = prisma as any;
  return await prismaAny.productImportHistory.findMany({
    orderBy: { importedAt: "desc" },
  });
};

const getImportHistoryById = async (id: string) => {
  const prismaAny = prisma as any;
  return await prismaAny.productImportHistory.findUnique({ where: { id } });
};

export const previewImportProducts = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const parsed = await parseCsvFile(req.file.path);
    await ensureTemporaryFileDeleted(req.file.path);

    const result = buildShopifyImportGroups(parsed);
    return res.status(200).json({
      success: true,
      data: { summary: result.summary, preview: result.groups.slice(0, 20) },
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to preview import file", details: error.message });
  }
};

export const importProducts = async (req: Request, res: Response) => {
  const mode = (req.body.mode || "create_update").toString();
  const matchBy = (req.body.matchBy || "sku").toString();

  try {
    console.log(
      "[IMPORT] importProducts called by user:",
      (req as any).user?.id || "anonymous",
    );
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const parsed = await parseCsvFile(req.file.path);
    console.log(
      "[IMPORT] CSV parsed, rows:",
      parsed.rows.length,
      "errors:",
      parsed.parseErrors.length,
    );
    await ensureTemporaryFileDeleted(req.file.path);

    if (parsed.parseErrors.length > 0) {
      return res
        .status(400)
        .json({ error: "CSV parsing failed", details: parsed.parseErrors });
    }

    const { groups, summary } = buildShopifyImportGroups(parsed);
    const historyDetails: any[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let actualProductCount = 0;
    let actualVariantCount = 0;
    const errors: any[] = [];
    const importedProductIds: string[] = [];
    const brandCache = new Map<string, string>();
    const categoryCache = new Map<string, string>();

    // Upload group and variant images in parallel with bounded concurrency
    try {
      console.log("[IMPORT] starting image uploads for groups:", groups.length);
      await mapWithConcurrency(groups, 4, async (group: any) => {
        try {
          await prepareGroupImageUploads(group);
        } catch (e: any) {
          console.error(
            "[IMPORT] prepareGroupImageUploads failed for group",
            group?.key,
            e?.message || e,
          );
          // mark error on group so it won't block DB transaction
          group._uploadError = e?.message || String(e);
        }
        return group;
      });
      console.log("[IMPORT] image uploads complete");
    } catch (e: any) {
      console.error(
        "[IMPORT] image upload concurrency failed:",
        e?.message || e,
      );
    }

    const batches: any[][] = [];
    for (let idx = 0; idx < groups.length; idx += MAX_BATCH_SIZE) {
      batches.push(groups.slice(idx, idx + MAX_BATCH_SIZE));
    }

    const startTime = Date.now();
    const importSlugSet = new Set<string>();

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(
        `[IMPORT] processing batch ${batchIndex + 1}/${batches.length} size=${batch.length}`,
      );
      for (const group of batch) {
        console.log("[IMPORT] processing group", group.key);
        actualProductCount += 1;
        actualVariantCount += group.variants.length;

        if (!group.name || !group.variants.length) {
          failedCount += 1;
          errors.push({
            rowNumber: group.rowCount,
            sku: group.variants[0]?.sku || "",
            reason: "Missing required product title or variants",
          });
          historyDetails.push({
            groupKey: group.key,
            status: "failed",
            reason: "Missing required product title or variants",
          });
          continue;
        }

        try {
          await prisma.$transaction(
            async (tx) => {
              const payload = await buildProductPayload(
                group,
                tx,
                brandCache,
                categoryCache,
              );
              const matchWhere: any = {};

              if (matchBy === "slug") {
                matchWhere.slug = payload.slug;
              } else {
                matchWhere.sku = payload.sku;
              }

              const existing = await tx.product.findFirst({
                where: matchWhere,
              });

              if (existing && mode === "create_only") {
                skippedCount += 1;
                historyDetails.push({
                  groupKey: group.key,
                  status: "skipped",
                  reason: "Existing SKU/slug found in create-only mode",
                });
                return;
              }

              const finalSlug = await ensureUniqueProductSlug(
                tx,
                payload.slug,
                importSlugSet,
                existing?.id,
              );

              if (!existing && mode === "skip_existing") {
                createdCount += 1;
                const created = await tx.product.create({
                  data: {
                    name: payload.name,
                    slug: finalSlug,
                    sku: payload.sku,
                    description: payload.description || null,
                    shortDescription: payload.short_description || null,
                    basePrice: payload.mrp || 0,
                    salePrice: payload.salePrice || null,
                    dealerPrice: payload.dealerPrice || null,
                    stock: payload.stock || 0,
                    categoryId: payload.categoryId || null,
                    brandId: payload.brandId || null,
                    isActive: payload.status === "active",
                    images: payload.images,
                    specifications: payload.specifications,
                    downloads: payload.downloads,
                    features: payload.features,
                    faqs: payload.faqs,
                    seo: {
                      title: payload.seoTitle || null,
                      description: payload.seoDescription || null,
                      keywords: payload.seoKeywords || [],
                    },
                    shipping: payload.shipping || {},
                    warranty: payload.warranty || {},
                    relatedProducts: payload.relatedProducts || [],
                    bundleProducts: payload.bundleProducts || [],
                    recommendedFilaments: payload.recommendedFilaments || [],
                    includedItems: payload.includedItems || [],
                    attributes: payload.attributes || [],
                    options: payload.options || [],
                  },
                });

                const usedSkus = new Set<string>([payload.sku]);
                let variantSuccessCount = 0;
                for (const variant of payload.variants) {
                  try {
                    const uniqueSku = await ensureUniqueVariantSku(
                      tx,
                      variant.sku,
                      payload.sku || `p-${created.id}`,
                      usedSkus,
                    );
                    if (uniqueSku !== (variant.sku || "").toString()) {
                      console.log(
                        `[IMPORT] adjusted SKU for variant of product ${created.id}: from='${variant.sku}' to='${uniqueSku}'`,
                      );
                    }
                    await tx.productVariant.create({
                      data: {
                        productId: created.id,
                        name: variant.name,
                        sku: uniqueSku,
                        price: variant.price || 0,
                        salePrice: variant.salePrice || null,
                        stock: variant.stock || 0,
                        weight: variant.weight || 0,
                        variantImages: variant.variantImages || [],
                        optionValues: variant.optionValues || {},
                      },
                    });
                    variantSuccessCount += 1;
                  } catch (variantErr: any) {
                    console.warn(
                      `[IMPORT] Failed to create variant for product ${created.id}:`,
                      variantErr.message,
                    );
                    errors.push({
                      rowNumber: group.rowCount,
                      sku: variant.sku || "unknown",
                      reason: `Variant creation failed: ${variantErr.message}`,
                    });
                  }
                }
                console.log(
                  `[IMPORT] Created ${variantSuccessCount}/${payload.variants.length} variants for product ${created.id}`,
                );

                importedProductIds.push(created.id);
                return;
              }

              if (!existing) {
                const created = await tx.product.create({
                  data: {
                    name: payload.name,
                    slug: finalSlug,
                    sku: payload.sku,
                    description: payload.description || null,
                    shortDescription: payload.short_description || null,
                    basePrice: payload.mrp || 0,
                    salePrice: payload.salePrice || null,
                    dealerPrice: payload.dealerPrice || null,
                    stock: payload.stock || 0,
                    categoryId: payload.categoryId || null,
                    brandId: payload.brandId || null,
                    isActive: payload.status === "active",
                    images: payload.images,
                    specifications: payload.specifications,
                    downloads: payload.downloads,
                    features: payload.features,
                    faqs: payload.faqs,
                    seo: {
                      title: payload.seoTitle || null,
                      description: payload.seoDescription || null,
                    },
                    shipping: payload.shipping || {},
                    warranty: payload.warranty || {},
                    relatedProducts: payload.relatedProducts || [],
                    bundleProducts: payload.bundleProducts || [],
                    recommendedFilaments: payload.recommendedFilaments || [],
                    includedItems: payload.includedItems || [],
                    attributes: payload.attributes || [],
                    options: payload.options || [],
                  },
                });

                const usedSkus = new Set<string>([payload.sku]);
                let variantSuccessCount = 0;
                for (const variant of payload.variants) {
                  try {
                    const uniqueSku = await ensureUniqueVariantSku(
                      tx,
                      variant.sku,
                      payload.sku || `p-${created.id}`,
                      usedSkus,
                    );
                    if (uniqueSku !== (variant.sku || "").toString()) {
                      console.log(
                        `[IMPORT] adjusted SKU for variant of product ${created.id}: from='${variant.sku}' to='${uniqueSku}'`,
                      );
                    }
                    await tx.productVariant.create({
                      data: {
                        productId: created.id,
                        name: variant.name,
                        sku: uniqueSku,
                        price: variant.price || 0,
                        salePrice: variant.salePrice || null,
                        stock: variant.stock || 0,
                        weight: variant.weight || 0,
                        variantImages: variant.variantImages || [],
                        optionValues: variant.optionValues || {},
                      },
                    });
                    variantSuccessCount += 1;
                  } catch (variantErr: any) {
                    console.warn(
                      `[IMPORT] Failed to create variant for product ${created.id}:`,
                      variantErr.message,
                    );
                    errors.push({
                      rowNumber: group.rowCount,
                      sku: variant.sku || "unknown",
                      reason: `Variant creation failed: ${variantErr.message}`,
                    });
                  }
                }
                console.log(
                  `[IMPORT] Created ${variantSuccessCount}/${payload.variants.length} variants for product ${created.id}`,
                );

                createdCount += 1;
                historyDetails.push({ groupKey: group.key, status: "created" });
                return;
              }

              // Existing product found
              if (mode === "update_existing" || mode === "create_update") {
                await tx.productVariant.deleteMany({
                  where: { productId: existing.id },
                });
                const updated = await tx.product.update({
                  where: { id: existing.id },
                  data: {
                    name: payload.name,
                    slug: finalSlug,
                    sku: payload.sku,
                    description: payload.description || null,
                    shortDescription: payload.short_description || null,
                    basePrice: payload.mrp || 0,
                    salePrice: payload.salePrice || null,
                    dealerPrice: payload.dealerPrice || null,
                    stock: payload.stock || 0,
                    categoryId: payload.categoryId || null,
                    brandId: payload.brandId || null,
                    isActive: payload.status === "active",
                    images: payload.images,
                    specifications: payload.specifications,
                    downloads: payload.downloads,
                    features: payload.features,
                    faqs: payload.faqs,
                    seo: {
                      title: payload.seoTitle || null,
                      description: payload.seoDescription || null,
                      keywords: payload.seoKeywords || [],
                    },
                    shipping: payload.shipping || {},
                    warranty: payload.warranty || {},
                    relatedProducts: payload.relatedProducts || [],
                    bundleProducts: payload.bundleProducts || [],
                    recommendedFilaments: payload.recommendedFilaments || [],
                    includedItems: payload.includedItems || [],
                    attributes: payload.attributes || [],
                    options: payload.options || [],
                  },
                });

                const usedSkus = new Set<string>([payload.sku]);
                let variantSuccessCount = 0;
                for (const variant of payload.variants) {
                  try {
                    const uniqueSku = await ensureUniqueVariantSku(
                      tx,
                      variant.sku,
                      payload.sku || `p-${updated.id}`,
                      usedSkus,
                    );
                    if (uniqueSku !== (variant.sku || "").toString()) {
                      console.log(
                        `[IMPORT] adjusted SKU for variant of product ${updated.id}: from='${variant.sku}' to='${uniqueSku}'`,
                      );
                    }
                    await tx.productVariant.create({
                      data: {
                        productId: updated.id,
                        name: variant.name,
                        sku: uniqueSku,
                        price: variant.price || 0,
                        salePrice: variant.salePrice || null,
                        stock: variant.stock || 0,
                        weight: variant.weight || 0,
                        variantImages: variant.variantImages || [],
                        optionValues: variant.optionValues || {},
                      },
                    });
                    variantSuccessCount += 1;
                  } catch (variantErr: any) {
                    console.warn(
                      `[IMPORT] Failed to create variant for product ${updated.id}:`,
                      variantErr.message,
                    );
                    errors.push({
                      rowNumber: group.rowCount,
                      sku: variant.sku || "unknown",
                      reason: `Variant creation failed: ${variantErr.message}`,
                    });
                  }
                }
                console.log(
                  `[IMPORT] Created ${variantSuccessCount}/${payload.variants.length} variants for product ${updated.id}`,
                );

                importedProductIds.push(updated.id);
                updatedCount += 1;
                historyDetails.push({ groupKey: group.key, status: "updated" });
                return;
              }

              skippedCount += 1;
              historyDetails.push({
                groupKey: group.key,
                status: "skipped",
                reason: "No update mode selected for existing record",
              });
            },
            { timeout: 120000 },
          );
        } catch (err: any) {
          const reason = err?.message || "Import failed";
          failedCount += 1;
          errors.push({
            rowNumber: group.rowCount,
            sku: group.variants[0]?.sku || "",
            reason,
          });
          historyDetails.push({
            groupKey: group.key,
            status: "failed",
            reason,
          });
          console.error(`[IMPORT] group failed ${group.key}:`, reason);
        }
      }
    }

    try {
      historyRecord = await prisma.productImportHistory.create({
        data: {
          importedBy: (req as any).user?.id || null,
          productCount: actualProductCount,
          variantCount: actualVariantCount,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount,
          durationSeconds,
          summary: summary,
          errors: errors,
          details: {
            groups: historyDetails,
            postProcessing: postProcessingSummary,
          },
        },
      });
    } catch (err: any) {
      console.error(
        "[IMPORT] Failed to save import history:",
        err?.message || err,
      );
      historyRecord = null;
    }

    clearProductCache();

    return res.status(200).json({
      success: true,
      data: {
        historyId: historyRecord?.id || null,
        productCount: actualProductCount,
        variantCount: actualVariantCount,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        durationSeconds,
        progressPercentage,
        errors,
        postProcessing: postProcessingSummary,
      },
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to import products", details: error.message });
  }
};

const escapeCsvValue = (value: any) => {
  if (value === null || value === undefined) return '""';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
};

export const downloadSampleCsv = async (req: Request, res: Response) => {
  try {
    const headers = [
      "Title",
      "Handle",
      "Body HTML",
      "Vendor",
      "Product Type",
      "Product Category",
      "Tags",
      "Published",
      "Variant SKU",
      "Variant Price",
      "Variant Compare At Price",
      "Variant Inventory Qty",
      "Variant Barcode",
      "Variant Weight",
      "Image Src",
      "SEO Title",
      "SEO Description",
    ];

    const sampleRows = [
      [
        escapeCsvValue("Premium 3D Printer Filament"),
        escapeCsvValue("premium-3d-filament-pla"),
        escapeCsvValue(
          "High-quality PLA filament for 3D printing with excellent dimensional accuracy",
        ),
        escapeCsvValue("TechBrand 3D"),
        escapeCsvValue("3D Filament"),
        escapeCsvValue("3D Printing Supplies"),
        escapeCsvValue("pla, filament, 3d-printing"),
        escapeCsvValue("TRUE"),
        escapeCsvValue("SKU-001-PLA-1KG"),
        escapeCsvValue("450"),
        escapeCsvValue("550"),
        escapeCsvValue("50"),
        escapeCsvValue(""),
        escapeCsvValue("1.0"),
        escapeCsvValue(
          "https://example.com/images/pla-filament-1.jpg,https://example.com/images/pla-filament-2.jpg",
        ),
        escapeCsvValue("Buy Premium PLA Filament | 1KG Spool"),
        escapeCsvValue(
          "High-quality PLA filament perfect for 3D printing projects. Durable and reliable.",
        ),
      ],
      [
        escapeCsvValue("Premium 3D Printer Filament"),
        escapeCsvValue("premium-3d-filament-pla"),
        escapeCsvValue(
          "High-quality PLA filament for 3D printing with excellent dimensional accuracy",
        ),
        escapeCsvValue("TechBrand 3D"),
        escapeCsvValue("3D Filament"),
        escapeCsvValue("3D Printing Supplies"),
        escapeCsvValue("pla, filament, 3d-printing"),
        escapeCsvValue("TRUE"),
        escapeCsvValue("SKU-002-PLA-2KG"),
        escapeCsvValue("850"),
        escapeCsvValue("1000"),
        escapeCsvValue("30"),
        escapeCsvValue(""),
        escapeCsvValue("2.0"),
        escapeCsvValue(
          "https://example.com/images/pla-filament-1.jpg,https://example.com/images/pla-filament-2.jpg",
        ),
        escapeCsvValue("Buy Premium PLA Filament | 2KG Spool"),
        escapeCsvValue(
          "High-quality PLA filament perfect for 3D printing projects. Durable and reliable.",
        ),
      ],
      [
        escapeCsvValue("ABS Professional Filament"),
        escapeCsvValue("abs-professional-filament"),
        escapeCsvValue(
          "Industrial-grade ABS filament for robust and heat-resistant prints",
        ),
        escapeCsvValue("TechBrand 3D"),
        escapeCsvValue("3D Filament"),
        escapeCsvValue("3D Printing Supplies"),
        escapeCsvValue("abs, filament, 3d-printing, industrial"),
        escapeCsvValue("TRUE"),
        escapeCsvValue("SKU-003-ABS-1KG"),
        escapeCsvValue("520"),
        escapeCsvValue("620"),
        escapeCsvValue("25"),
        escapeCsvValue(""),
        escapeCsvValue("1.0"),
        escapeCsvValue(
          "https://example.com/images/abs-filament-1.jpg,https://example.com/images/abs-filament-2.jpg",
        ),
        escapeCsvValue("Buy ABS Professional Filament | 1KG Spool"),
        escapeCsvValue(
          "Industrial-grade ABS filament for robust 3D printing. Heat-resistant and durable.",
        ),
      ],
    ];

    const rows = [headers.join(","), ...sampleRows.map((row) => row.join(","))];
    const csv = rows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sample-products-${Date.now()}.csv"`,
    );
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to generate sample CSV",
      details: error.message,
    });
  }
};

export const exportProductsCsv = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: { variants: true },
    });

    const headers = [
      "Title",
      "Handle",
      "Body HTML",
      "Vendor",
      "Product Type",
      "Tags",
      "Published",
      "Option1 Name",
      "Option1 Value",
      "Option2 Name",
      "Option2 Value",
      "Option3 Name",
      "Option3 Value",
      "Variant SKU",
      "Variant Price",
      "Variant Compare At Price",
      "Variant Inventory Qty",
      "Variant Inventory Policy",
      "Variant Fulfillment Service",
      "Variant Requires Shipping",
      "Variant Weight",
      "Variant Taxable",
      "Variant Barcode",
      "Image Src",
      "SEO Title",
      "SEO Description",
    ];

    const rows: string[] = [headers.join(",")];

    for (const product of products) {
      const imageUrls = Array.isArray(product.images)
        ? product.images
            .map((img: any) => (typeof img === "string" ? img : img.url))
            .filter(Boolean)
        : [];
      const tags = Array.isArray(product.attributes)
        ? product.attributes.map((attr: any) => attr.name || attr).join(", ")
        : "";
      const firstImage = imageUrls[0] || "";
      const seo =
        typeof product.seo === "object" && !Array.isArray(product.seo)
          ? product.seo
          : {};
      const seoTitle = (seo as any)?.title || "";
      const seoDescription = (seo as any)?.description || "";

      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const row = [
            escapeCsvValue(product.name),
            escapeCsvValue(product.slug),
            escapeCsvValue(product.description || ""),
            escapeCsvValue(product.brandId || ""),
            escapeCsvValue(product.categoryId || ""),
            escapeCsvValue(tags),
            escapeCsvValue(product.isActive ? "TRUE" : "FALSE"),
            escapeCsvValue("Title"),
            escapeCsvValue(variant.name || ""),
            escapeCsvValue(""),
            escapeCsvValue(""),
            escapeCsvValue(""),
            escapeCsvValue(""),
            escapeCsvValue(variant.sku),
            escapeCsvValue(variant.price),
            escapeCsvValue(variant.salePrice || ""),
            escapeCsvValue(variant.stock),
            escapeCsvValue("deny"),
            escapeCsvValue("manual"),
            escapeCsvValue("TRUE"),
            escapeCsvValue(variant.weight || ""),
            escapeCsvValue("TRUE"),
            escapeCsvValue((variant as any).barcode || ""),
            escapeCsvValue(firstImage),
            escapeCsvValue(seoTitle),
            escapeCsvValue(seoDescription),
          ];
          rows.push(row.join(","));
        }
      } else {
        const row = [
          escapeCsvValue(product.name),
          escapeCsvValue(product.slug),
          escapeCsvValue(product.description || ""),
          escapeCsvValue(product.brandId || ""),
          escapeCsvValue(product.categoryId || ""),
          escapeCsvValue(tags),
          escapeCsvValue(product.isActive ? "TRUE" : "FALSE"),
          escapeCsvValue("Title"),
          escapeCsvValue(""),
          escapeCsvValue(""),
          escapeCsvValue(""),
          escapeCsvValue(""),
          escapeCsvValue(""),
          escapeCsvValue(product.sku),
          escapeCsvValue(product.basePrice),
          escapeCsvValue(product.salePrice || ""),
          escapeCsvValue(product.stock),
          escapeCsvValue("deny"),
          escapeCsvValue("manual"),
          escapeCsvValue("TRUE"),
          escapeCsvValue(""),
          escapeCsvValue("TRUE"),
          escapeCsvValue(""),
          escapeCsvValue(firstImage),
          escapeCsvValue(seoTitle),
          escapeCsvValue(seoDescription),
        ];
        rows.push(row.join(","));
      }
    }

    const csv = rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="product-export-${Date.now()}.csv"`,
    );
    return res.send(csv);
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to export products", details: error.message });
  }
};

export const getImportHistory = async (_req: Request, res: Response) => {
  try {
    const history = await getImportHistoryList();
    return res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to fetch import history",
      details: error.message,
    });
  }
};

export const getImportLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await getImportHistoryById(id);
    if (!history) {
      return res.status(404).json({ error: "Import log not found" });
    }
    return res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: "Failed to fetch import log", details: error.message });
  }
};
