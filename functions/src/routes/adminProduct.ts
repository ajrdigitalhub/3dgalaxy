import { Router } from "express";
import { getAdminProducts, getProductById, quickUpdateProduct, quickUpdateVariant, getProductVariants } from "../controllers/product";
import {
  previewImportProducts,
  importProducts,
  getImportHistory,
  getImportLog,
  exportProductsCsv,
  downloadSampleCsv,
} from "../controllers/productImport";
import { authenticateToken, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.get(
  "/",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  getAdminProducts,
);

router.get(
  "/:id/details",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  getProductById,
);

router.patch(
  "/:id/quick-update",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  quickUpdateProduct,
);

router.patch(
  "/:productId/variants/:variantId/quick-update",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  quickUpdateVariant,
);

router.get(
  "/:id/variants",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  getProductVariants,
);

router.get(
  "/import/sample",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  downloadSampleCsv,
);
router.post(
  "/import/preview",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  upload.single("file", 50 * 1024 * 1024, /csv|text\/csv/i),
  previewImportProducts,
);
router.post(
  "/import",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  upload.single("file", 50 * 1024 * 1024, /csv|text\/csv/i),
  importProducts,
);
router.get(
  "/import/history",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  getImportHistory,
);
router.get(
  "/import/log/:id",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  getImportLog,
);
router.post(
  "/export",
  authenticateToken,
  requireRole(["Admin", "Manager", "Super Admin"]),
  exportProductsCsv,
);

export default router;
