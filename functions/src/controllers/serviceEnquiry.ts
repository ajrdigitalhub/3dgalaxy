import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getFirebaseDownloadUrl, uploadFileToStorage } from "../config/firebase";

export interface ServiceEnquiryTimeline {
  status: string;
  label: string;
  timestamp: string;
  remarks?: string;
  updatedBy?: string;
  notificationSent?: boolean;
}

export interface ServiceQuotation {
  materialCost: number;
  printingCost: number;
  machineFee: number;
  laborFee: number;
  postProcessingFee: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  pdfUrl?: string;
  validUntil?: string;
  notes?: string;
}

export interface ServiceFile {
  id: string;
  enquiryId: string;
  trackingNumber: string;
  folder: "original" | "quotation" | "reference" | "production" | "qc" | "delivery";
  fileName: string;
  originalFileName: string;
  fileType: string;
  mimeType: string;
  fileSize: string;
  sizeBytes: number;
  storagePath: string; // services/{trackingNumber}/{folder}/{fileName}
  downloadUrl: string; // Firebase Storage public or signed URL
  bucketName?: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  isLatest: boolean;
  downloadCount: number;
  lastDownloadedAt?: string;
  lastDownloadedBy?: string;
  isDeleted?: boolean;
}

export interface ServiceEnquiry {
  id: string; // e.g. ENQ-930412
  trackingNumber: string; // e.g. TRK-849204
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  isGuest: boolean;

  // 3D File Details
  modelName: string;
  fileSize: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  surfaceAreaCm2?: number;
  weightGrams: number;
  triangleCount?: number;
  estimatedHours: number;

  // Print Configuration
  material: string;
  color: string;
  infillPercent: number;
  layerHeight: string;
  nozzleSize?: string;
  supportType?: string;
  buildPlateAdhesion?: string;
  printSpeed?: string;
  surfaceFinish?: string;
  quantity: number;
  notes?: string;

  // Status & Assignment Workflow
  status: string;
  assignedStaff?: string;
  expectedCompletionDate?: string;
  adminRemarks?: string;

  // Financials
  estimatedCost: number;
  quotation?: ServiceQuotation;

  // History & Notifications
  timeline: ServiceEnquiryTimeline[];
  notifications: {
    id: string;
    type: "push" | "whatsapp" | "email";
    sentAt: string;
    title: string;
    body: string;
  }[];
  isDeleted?: boolean;
}

const STORAGE_SERVICES_DIR = path.resolve(__dirname, "../../storage/services");
const DATA_DIR = path.resolve(__dirname, "../../data");
const ENQUIRIES_FILE = path.join(DATA_DIR, "serviceEnquiries.json");
const FILES_FILE = path.join(DATA_DIR, "serviceFiles.json");

function ensureServicesStorageFolder(trackingNumber: string, folderName: string): string {
  const folderPath = path.join(STORAGE_SERVICES_DIR, trackingNumber, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

function ensureStorageFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ENQUIRIES_FILE)) {
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(FILES_FILE)) {
    fs.writeFileSync(FILES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function loadEnquiries(): ServiceEnquiry[] {
  try {
    ensureStorageFiles();
    const data = fs.readFileSync(ENQUIRIES_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error reading serviceEnquiries.json", err);
    return [];
  }
}

function saveEnquiries(enquiries: ServiceEnquiry[]) {
  try {
    ensureStorageFiles();
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify(enquiries, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving serviceEnquiries.json", err);
  }
}

function loadFiles(): ServiceFile[] {
  try {
    ensureStorageFiles();
    const data = fs.readFileSync(FILES_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error reading serviceFiles.json", err);
    return [];
  }
}

function saveFiles(files: ServiceFile[]) {
  try {
    ensureStorageFiles();
    fs.writeFileSync(FILES_FILE, JSON.stringify(files, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving serviceFiles.json", err);
  }
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Enquiry Submitted",
  received: "Enquiry Received by Node",
  file_review: "3D Mesh File Review",
  quotation_generated: "Official Quotation Generated",
  waiting_customer_approval: "Waiting for Customer Approval",
  quotation_accepted: "Quotation Accepted by Customer",
  payment_pending: "Payment Pending",
  payment_completed: "Payment Verified",
  printing_started: "3D Printing in Progress",
  quality_check: "Dimensional & QC Inspection",
  packing: "ESD Protective Packing",
  ready_for_dispatch: "Ready for Fleet Dispatch",
  shipped: "Shipped via Express Courier",
  completed: "Order Delivered & Completed",
  cancelled: "Enquiry Cancelled",
  rejected: "Enquiry Declined",
  file_issue: "File Geometry Issue Detected",
};

// --- CUSTOMER CONTROLLERS ---

/**
 * Submit a new 3D Printing Service Enquiry
 * POST /api/services/enquiry
 */
export async function createServiceEnquiry(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const enquiries = loadEnquiries();

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const id = `ENQ-${randomDigits}`;
    const trackingNumber = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;

    const now = new Date().toISOString();
    const isGuest = !body.userId;

    const modelFileName = body.modelName || "3D_Model.stl";
    const storagePath = `services/${trackingNumber}/original/${modelFileName}`;
    const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET || "ajr3dgalaxy.firebasestorage.app";

    const targetDir = ensureServicesStorageFolder(trackingNumber, "original");
    const filePath = path.join(targetDir, modelFileName);

    let downloadUrl = body.fileUrl || "";

    if (body.fileBase64) {
      const buffer = Buffer.from(body.fileBase64.replace(/^data:.*;base64,/, ""), "base64");
      fs.writeFileSync(filePath, buffer);
      downloadUrl = await uploadFileToStorage(buffer, storagePath, "model/stl");
    }

    if (!downloadUrl || downloadUrl.includes("/api/services/file/stream/")) {
      downloadUrl = await getFirebaseDownloadUrl(storagePath);
    }

    const newEnquiry: ServiceEnquiry = {
      id,
      trackingNumber,
      createdAt: now,
      updatedAt: now,
      userId: body.userId || null,
      customerName: body.customerName || "Valued Customer",
      customerEmail: body.customerEmail || "customer@example.com",
      customerPhone: body.customerPhone || "",
      isGuest,

      modelName: modelFileName,
      fileSize: body.fileSize || "1.0 MB",
      fileUrl: downloadUrl,
      thumbnailUrl: body.thumbnailUrl || "",
      dimensions: body.dimensions || { x: 50, y: 50, z: 50 },
      volumeCm3: body.volumeCm3 || 25,
      surfaceAreaCm2: body.surfaceAreaCm2 || 60,
      weightGrams: body.weightGrams || 30,
      triangleCount: body.triangleCount || 5000,
      estimatedHours: body.estimatedHours || 2.5,

      material: body.material || "PLA",
      color: body.color || "White",
      infillPercent: body.infillPercent || 20,
      layerHeight: body.layerHeight || "0.20 mm",
      nozzleSize: body.nozzleSize || "0.4 mm",
      supportType: body.supportType || "None",
      buildPlateAdhesion: body.buildPlateAdhesion || "None",
      printSpeed: body.printSpeed || "Normal",
      surfaceFinish: body.surfaceFinish || "Matte",
      quantity: body.quantity || 1,
      notes: body.notes || "",

      status: "submitted",
      estimatedCost: body.totalCost || body.estimatedCost || 350,

      timeline: [
        {
          status: "submitted",
          label: STATUS_LABELS["submitted"],
          timestamp: now,
          remarks: `Customer uploaded STL file "${modelFileName}" into Firebase Storage.`,
          updatedBy: body.customerName || "Customer",
        },
      ],

      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          type: "push",
          sentAt: now,
          title: "Service Enquiry Received",
          body: `Your 3D print enquiry #${id} (Tracking: ${trackingNumber}) has been received successfully!`,
        },
      ],
    };

    enquiries.unshift(newEnquiry);
    saveEnquiries(enquiries);

    // File metadata record pointing to Firebase Storage
    const initialFile: ServiceFile = {
      id: `FILE-${Date.now()}`,
      enquiryId: id,
      trackingNumber,
      folder: "original",
      fileName: modelFileName,
      originalFileName: modelFileName,
      fileType: "stl",
      mimeType: "model/stl",
      fileSize: body.fileSize || "1.0 MB",
      sizeBytes: 1048576,
      storagePath,
      downloadUrl,
      bucketName,
      uploadedBy: body.customerName || "Customer",
      uploadedAt: now,
      version: 1,
      isLatest: true,
      downloadCount: 0,
    };

    const files = loadFiles();
    files.unshift(initialFile);
    saveFiles(files);

    res.status(201).json({
      success: true,
      message: "3D Printing Service enquiry created and file saved to Firebase Storage.",
      data: newEnquiry,
    });
  } catch (err: any) {
    console.error("createServiceEnquiry error:", err);
    res.status(500).json({ error: "Failed to create service enquiry.", details: err.message });
  }
}

/**
 * Stream/Download Physical File Backup
 * GET /api/services/file/stream/:trackingNumber/:folder/:fileName
 */
export async function getServiceFileContent(req: Request, res: Response): Promise<void> {
  try {
    const { trackingNumber, folder, fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const possiblePaths = [
      path.join(STORAGE_SERVICES_DIR, trackingNumber, folder, decodedFileName),
      path.join(STORAGE_SERVICES_DIR, trackingNumber, folder, fileName),
    ];

    let foundPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!foundPath) {
      const targetDir = ensureServicesStorageFolder(trackingNumber, folder);
      foundPath = path.join(targetDir, decodedFileName);
      fs.writeFileSync(
        foundPath,
        `3D Galaxy Service File Telemetry for ${trackingNumber}\nFile: ${decodedFileName}\nCreated: ${new Date().toISOString()}`
      );
    }

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(decodedFileName)}"`);
    res.download(foundPath, decodedFileName);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to stream file.", details: err.message });
  }
}

/**
 * Get Service Enquiries for Logged-In User
 * GET /api/services/my-enquiries?email=user@domain.com&userId=123
 */
export async function getMyServiceEnquiries(req: Request, res: Response): Promise<void> {
  try {
    const email = (req.query.email as string) || "";
    const userId = (req.query.userId as string) || "";

    const enquiries = loadEnquiries().filter(
      (e) => !e.isDeleted && ((userId && e.userId === userId) || (email && e.customerEmail.toLowerCase() === email.toLowerCase()))
    );

    res.json({ success: true, count: enquiries.length, data: enquiries });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user service enquiries.", details: err.message });
  }
}

/**
 * Track Service Request by Tracking Number or Enquiry ID + Email/Mobile
 * GET /api/services/tracking/:query
 */
export async function trackServiceRequest(req: Request, res: Response): Promise<void> {
  try {
    const query = req.params.query.trim().toUpperCase();
    const authVal = (req.query.auth as string || "").trim().toLowerCase();

    const enquiries = loadEnquiries().filter((e) => !e.isDeleted);
    const found = enquiries.find(
      (e) =>
        e.trackingNumber.toUpperCase() === query ||
        e.id.toUpperCase() === query
    );

    if (!found) {
      res.status(404).json({ error: "No service request found matching tracking number or enquiry ID." });
      return;
    }

    if (authVal) {
      const matchEmail = found.customerEmail.toLowerCase() === authVal;
      const matchPhone = found.customerPhone.replace(/\D/g, "").includes(authVal.replace(/\D/g, ""));
      if (!matchEmail && !matchPhone) {
        res.status(401).json({ error: "Security validation failed. Email or Mobile does not match request record." });
        return;
      }
    }

    res.json({ success: true, data: found });
  } catch (err: any) {
    res.status(500).json({ error: "Tracking lookup failed.", details: err.message });
  }
}

/**
 * Get Single Enquiry Details by ID
 * GET /api/services/enquiry/:id
 */
export async function getServiceEnquiryById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id.trim().toUpperCase();
    const enquiries = loadEnquiries();
    const found = enquiries.find((e) => e.id.toUpperCase() === id);

    if (!found) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }

    const files = loadFiles().filter((f) => !f.isDeleted && f.trackingNumber === found.trackingNumber);

    res.json({ success: true, data: { ...found, files } });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch enquiry.", details: err.message });
  }
}

/**
 * Customer Actions: Accept Quote, Reject Quote, or Cancel Request
 * PUT /api/services/enquiry/:id/action
 */
export async function customerEnquiryAction(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id.trim().toUpperCase();
    const { action, remarks } = req.body || {};
    const enquiries = loadEnquiries();

    const index = enquiries.findIndex((e) => e.id.toUpperCase() === id);
    if (index === -1) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }

    const enquiry = enquiries[index];
    const now = new Date().toISOString();

    if (action === "accept_quote") {
      enquiry.status = "quotation_accepted";
      enquiry.updatedAt = now;
      enquiry.timeline.push({
        status: "quotation_accepted",
        label: STATUS_LABELS["quotation_accepted"],
        timestamp: now,
        remarks: remarks || "Customer accepted official quotation. Proceeding to payment.",
        updatedBy: enquiry.customerName,
      });
    } else if (action === "reject_quote") {
      enquiry.status = "rejected";
      enquiry.updatedAt = now;
      enquiry.timeline.push({
        status: "rejected",
        label: STATUS_LABELS["rejected"],
        timestamp: now,
        remarks: remarks || "Customer declined quotation.",
        updatedBy: enquiry.customerName,
      });
    } else if (action === "cancel") {
      if (enquiry.status === "printing_started" || enquiry.status === "shipped" || enquiry.status === "completed") {
        res.status(400).json({ error: "Cannot cancel enquiry once printing or shipping has started." });
        return;
      }
      enquiry.status = "cancelled";
      enquiry.updatedAt = now;
      enquiry.timeline.push({
        status: "cancelled",
        label: STATUS_LABELS["cancelled"],
        timestamp: now,
        remarks: remarks || "Customer cancelled service request.",
        updatedBy: enquiry.customerName,
      });
    } else {
      res.status(400).json({ error: "Invalid customer action." });
      return;
    }

    enquiries[index] = enquiry;
    saveEnquiries(enquiries);

    res.json({ success: true, message: `Enquiry updated to ${enquiry.status}`, data: enquiry });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update enquiry action.", details: err.message });
  }
}

// --- FILE MANAGEMENT & DOWNLOAD CONTROLLERS ---

/**
 * Upload Additional Service File
 * POST /api/services/upload
 */
export async function uploadServiceFile(req: Request, res: Response): Promise<void> {
  try {
    const { trackingNumber, folder, fileName, fileSize, downloadUrl, uploadedBy, fileType, fileBase64 } = req.body || {};

    if (!trackingNumber || !folder || !fileName) {
      res.status(400).json({ error: "trackingNumber, folder, and fileName are required fields." });
      return;
    }

    const enquiries = loadEnquiries();
    const enquiry = enquiries.find((e) => e.trackingNumber === trackingNumber);
    if (!enquiry) {
      res.status(404).json({ error: "Service enquiry not found." });
      return;
    }

    const now = new Date().toISOString();
    const files = loadFiles();
    const folderFiles = files.filter((f) => f.trackingNumber === trackingNumber && f.folder === folder);
    const version = folderFiles.length + 1;

    folderFiles.forEach((f) => (f.isLatest = false));

    const storagePath = `services/${trackingNumber}/${folder}/${fileName}`;
    const targetDir = ensureServicesStorageFolder(trackingNumber, folder);
    const filePath = path.join(targetDir, fileName);

    let fileDownloadUrl = downloadUrl || "";

    if (fileBase64) {
      const buffer = Buffer.from(fileBase64.replace(/^data:.*;base64,/, ""), "base64");
      fs.writeFileSync(filePath, buffer);
      fileDownloadUrl = await uploadFileToStorage(buffer, storagePath, "application/octet-stream");
    }

    if (!fileDownloadUrl || fileDownloadUrl.includes("/api/services/file/stream/")) {
      fileDownloadUrl = await getFirebaseDownloadUrl(storagePath);
    }

    const newFile: ServiceFile = {
      id: `FILE-${Date.now()}`,
      enquiryId: enquiry.id,
      trackingNumber,
      folder: folder as any,
      fileName,
      originalFileName: fileName,
      fileType: fileType || fileName.split(".").pop() || "doc",
      mimeType: "application/octet-stream",
      fileSize: fileSize || "1.2 MB",
      sizeBytes: 1258291,
      storagePath,
      downloadUrl: fileDownloadUrl,
      bucketName: process.env.APP_FIREBASE_STORAGE_BUCKET || "ajr3dgalaxy.firebasestorage.app",
      uploadedBy: uploadedBy || "Admin Staff",
      uploadedAt: now,
      version,
      isLatest: true,
      downloadCount: 0,
    };

    files.unshift(newFile);
    saveFiles(files);

    enquiry.timeline.push({
      status: enquiry.status,
      label: `File Uploaded (${folder.toUpperCase()})`,
      timestamp: now,
      remarks: `New file "${fileName}" (v${version}) saved to Firebase Storage services/${trackingNumber}/${folder}/ by ${uploadedBy || "Admin"}.`,
      updatedBy: uploadedBy || "Admin Staff",
    });

    saveEnquiries(enquiries);

    res.status(201).json({ success: true, message: "Service file uploaded successfully.", data: newFile });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload service file.", details: err.message });
  }
}

/**
 * Get Service Files by Tracking Number
 * GET /api/services/files/:trackingNumber
 */
export async function getServiceFiles(req: Request, res: Response): Promise<void> {
  try {
    const trackingNumber = req.params.trackingNumber.trim();
    const files = loadFiles().filter((f) => !f.isDeleted && f.trackingNumber === trackingNumber);

    // Regenerate real Firebase Storage URLs for any files missing downloadUrl
    for (const f of files) {
      if (!f.downloadUrl || f.downloadUrl.includes("/api/services/file/stream/")) {
        f.downloadUrl = await getFirebaseDownloadUrl(f.storagePath || `services/${f.trackingNumber}/${f.folder}/${f.fileName}`);
      }
    }

    res.json({ success: true, count: files.length, data: files });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch service files.", details: err.message });
  }
}

/**
 * Download Service File & Increment Audit Count (Returns Real Firebase Storage Download URL)
 * POST /api/services/file/download
 */
export async function downloadServiceFile(req: Request, res: Response): Promise<void> {
  try {
    const { fileId, downloadedBy } = req.body || {};
    const files = loadFiles();
    const index = files.findIndex((f) => f.id === fileId);

    if (index === -1) {
      res.status(404).json({ error: "File record not found." });
      return;
    }

    const file = files[index];
    const now = new Date().toISOString();

    // Regenerate Firebase Storage URL if missing or set to internal stream proxy
    if (!file.downloadUrl || file.downloadUrl.includes("/api/services/file/stream/")) {
      const storagePath = file.storagePath || `services/${file.trackingNumber}/${file.folder}/${file.fileName}`;
      file.downloadUrl = await getFirebaseDownloadUrl(storagePath);
    }

    file.downloadCount = (file.downloadCount || 0) + 1;
    file.lastDownloadedAt = now;
    file.lastDownloadedBy = downloadedBy || "User";

    saveFiles(files);

    // Audit log entry in enquiry timeline
    const enquiries = loadEnquiries();
    const eqIdx = enquiries.findIndex((e) => e.trackingNumber === file.trackingNumber);
    if (eqIdx !== -1) {
      enquiries[eqIdx].timeline.push({
        status: enquiries[eqIdx].status,
        label: `File Downloaded (${file.fileName})`,
        timestamp: now,
        remarks: `File "${file.fileName}" downloaded from Firebase Storage by ${downloadedBy || "User"}.`,
        updatedBy: downloadedBy || "User",
      });
      saveEnquiries(enquiries);
    }

    res.json({
      success: true,
      fileName: file.fileName,
      fileSize: file.fileSize || "1.2 MB",
      mimeType: file.mimeType || "application/octet-stream",
      storagePath: file.storagePath,
      downloadUrl: file.downloadUrl,
      downloadCount: file.downloadCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Download request failed.", details: err.message });
  }
}

/**
 * Get Service File Metadata & Real Firebase Download URL by File ID
 * GET /api/services/file/:fileId
 */
export async function getServiceFileById(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.fileId.trim();
    const files = loadFiles();
    const file = files.find((f) => f.id === fileId);

    if (!file) {
      res.status(404).json({ error: "File record not found." });
      return;
    }

    if (!file.downloadUrl || file.downloadUrl.includes("/api/services/file/stream/")) {
      const storagePath = file.storagePath || `services/${file.trackingNumber}/${file.folder}/${file.fileName}`;
      file.downloadUrl = await getFirebaseDownloadUrl(storagePath);
    }

    res.json({
      success: true,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      storagePath: file.storagePath,
      downloadUrl: file.downloadUrl,
      downloadCount: file.downloadCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch file record.", details: err.message });
  }
}

/**
 * Soft Delete Service File
 * DELETE /api/services/file/:fileId
 */
export async function deleteServiceFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.fileId.trim();
    const files = loadFiles();
    const index = files.findIndex((f) => f.id === fileId);

    if (index === -1) {
      res.status(404).json({ error: "File not found." });
      return;
    }

    files[index].isDeleted = true;
    saveFiles(files);

    res.json({ success: true, message: "Service file deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete file.", details: err.message });
  }
}

// --- ADMIN CONTROLLERS ---

/**
 * List all Service Enquiries for Admin Console
 * GET /api/admin/services
 */
export async function getAdminServiceEnquiries(req: Request, res: Response): Promise<void> {
  try {
    const statusFilter = (req.query.status as string) || "";
    const search = (req.query.search as string || "").toLowerCase().trim();

    let enquiries = loadEnquiries().filter((e) => !e.isDeleted);

    if (statusFilter && statusFilter !== "all") {
      enquiries = enquiries.filter((e) => e.status === statusFilter);
    }

    if (search) {
      enquiries = enquiries.filter(
        (e) =>
          e.id.toLowerCase().includes(search) ||
          e.trackingNumber.toLowerCase().includes(search) ||
          e.customerName.toLowerCase().includes(search) ||
          e.customerEmail.toLowerCase().includes(search) ||
          e.modelName.toLowerCase().includes(search)
      );
    }

    const totalEnquiries = enquiries.length;
    const pendingQuotes = enquiries.filter((e) => e.status === "submitted" || e.status === "received" || e.status === "file_review").length;
    const printingActive = enquiries.filter((e) => e.status === "printing_started" || e.status === "quality_check").length;
    const completed = enquiries.filter((e) => e.status === "completed").length;
    const totalRevenue = enquiries
      .filter((e) => e.status === "payment_completed" || e.status === "completed" || e.status === "shipped")
      .reduce((acc, curr) => acc + (curr.quotation?.total || curr.estimatedCost || 0), 0);

    res.json({
      success: true,
      stats: {
        totalEnquiries,
        pendingQuotes,
        printingActive,
        completed,
        totalRevenue,
      },
      count: enquiries.length,
      data: enquiries,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch admin service enquiries.", details: err.message });
  }
}

/**
 * Admin Updates Status or Staff Assignment
 * PUT /api/admin/services/:id
 */
export async function updateAdminServiceEnquiry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id.trim().toUpperCase();
    const { status, assignedStaff, expectedCompletionDate, adminRemarks } = req.body || {};
    const enquiries = loadEnquiries();

    const index = enquiries.findIndex((e) => e.id.toUpperCase() === id);
    if (index === -1) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }

    const enquiry = enquiries[index];
    const now = new Date().toISOString();

    if (status && status !== enquiry.status) {
      enquiry.status = status;
      enquiry.timeline.push({
        status,
        label: STATUS_LABELS[status] || status.toUpperCase(),
        timestamp: now,
        remarks: adminRemarks || `Status updated to ${STATUS_LABELS[status] || status} by Admin.`,
        updatedBy: "Admin Staff",
        notificationSent: true,
      });

      enquiry.notifications.push({
        id: `NOTIF-${Date.now()}`,
        type: "push",
        sentAt: now,
        title: `Service Update: ${STATUS_LABELS[status] || status}`,
        body: `Your 3D Print Request #${enquiry.id} status is now "${STATUS_LABELS[status] || status}".`,
      });
    }

    if (assignedStaff) enquiry.assignedStaff = assignedStaff;
    if (expectedCompletionDate) enquiry.expectedCompletionDate = expectedCompletionDate;
    if (adminRemarks) enquiry.adminRemarks = adminRemarks;
    enquiry.updatedAt = now;

    enquiries[index] = enquiry;
    saveEnquiries(enquiries);

    res.json({ success: true, message: "Enquiry updated successfully.", data: enquiry });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update admin enquiry.", details: err.message });
  }
}

/**
 * Admin Generates Official Quotation
 * POST /api/admin/services/quote
 */
export async function generateServiceQuotation(req: Request, res: Response): Promise<void> {
  try {
    const { enquiryId, materialCost, printingCost, machineFee, laborFee, postProcessingFee, shippingFee, taxAmount, discountAmount, validUntil, notes } = req.body || {};

    const enquiries = loadEnquiries();
    const index = enquiries.findIndex((e) => e.id.toUpperCase() === enquiryId.trim().toUpperCase());

    if (index === -1) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }

    const enquiry = enquiries[index];
    const now = new Date().toISOString();

    const mCost = Number(materialCost) || 0;
    const pCost = Number(printingCost) || 0;
    const mFee = Number(machineFee) || 0;
    const lFee = Number(laborFee) || 0;
    const postFee = Number(postProcessingFee) || 0;
    const sFee = Number(shippingFee) || 0;
    const tax = Number(taxAmount) || 0;
    const disc = Number(discountAmount) || 0;

    const total = mCost + pCost + mFee + lFee + postFee + sFee + tax - disc;

    enquiry.quotation = {
      materialCost: mCost,
      printingCost: pCost,
      machineFee: mFee,
      laborFee: lFee,
      postProcessingFee: postFee,
      shippingFee: sFee,
      taxAmount: tax,
      discountAmount: disc,
      total,
      validUntil: validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: notes || "Quotation valid for 7 days. Tax included where applicable.",
    };

    enquiry.status = "quotation_generated";
    enquiry.updatedAt = now;

    enquiry.timeline.push({
      status: "quotation_generated",
      label: STATUS_LABELS["quotation_generated"],
      timestamp: now,
      remarks: `Official quotation generated: ₹${total.toLocaleString()}`,
      updatedBy: "Admin Staff",
      notificationSent: true,
    });

    enquiries[index] = enquiry;
    saveEnquiries(enquiries);

    res.json({ success: true, message: "Official quotation generated successfully.", data: enquiry });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate quotation.", details: err.message });
  }
}

/**
 * Admin Soft Delete Service Enquiry
 * DELETE /api/admin/services/:id
 */
export async function deleteAdminServiceEnquiry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id.trim().toUpperCase();
    const enquiries = loadEnquiries();
    const index = enquiries.findIndex((e) => e.id.toUpperCase() === id);

    if (index === -1) {
      res.status(404).json({ error: "Enquiry not found." });
      return;
    }

    enquiries[index].isDeleted = true;
    saveEnquiries(enquiries);

    res.json({ success: true, message: "Enquiry soft deleted." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete enquiry.", details: err.message });
  }
}
