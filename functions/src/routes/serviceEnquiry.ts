import { Router } from "express";
import {
  createServiceEnquiry,
  getMyServiceEnquiries,
  trackServiceRequest,
  getServiceEnquiryById,
  customerEnquiryAction,
  getAdminServiceEnquiries,
  updateAdminServiceEnquiry,
  generateServiceQuotation,
  deleteAdminServiceEnquiry,
  uploadServiceFile,
  getServiceFiles,
  downloadServiceFile,
  deleteServiceFile,
  getServiceFileContent,
  getServiceFileById,
} from "../controllers/serviceEnquiry";

const router = Router();

// Customer & Public Endpoints
router.post("/enquiry", createServiceEnquiry);
router.get("/my-enquiries", getMyServiceEnquiries);
router.get("/tracking/:query", trackServiceRequest);
router.get("/enquiry/:id", getServiceEnquiryById);
router.put("/enquiry/:id/action", customerEnquiryAction);

// File Operations & Management (Real Firebase Storage URL)
router.post("/upload", uploadServiceFile);
router.get("/files/:trackingNumber", getServiceFiles);
router.get("/file/stream/:trackingNumber/:folder/:fileName", getServiceFileContent);
router.get("/file/:fileId", getServiceFileById);
router.post("/file/download", downloadServiceFile);
router.delete("/file/:fileId", deleteServiceFile);

import { authenticateToken, requireRole } from "../middleware/auth";

const adminEnquiryGuard = [authenticateToken, requireRole(['Admin', 'Super Admin', 'Manager'])];

// Admin Endpoints
router.get("/", ...adminEnquiryGuard, getAdminServiceEnquiries);
router.put("/:id", ...adminEnquiryGuard, updateAdminServiceEnquiry);
router.post("/quote", ...adminEnquiryGuard, generateServiceQuotation);
router.delete("/:id", ...adminEnquiryGuard, deleteAdminServiceEnquiry);

export default router;
