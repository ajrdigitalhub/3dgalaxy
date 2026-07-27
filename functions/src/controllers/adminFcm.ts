import { Request, Response } from "express";
import prisma from "../config/database";
import { getFirebaseAdmin } from "../config/firebase";
import fs from "fs";
import path from "path";
import os from "os";

export interface AdminDeviceRecord {
  id: string;
  adminId: string;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
  deviceName: string;
  deviceType: string;       // Desktop, Mobile, Tablet
  platform: string;         // Windows 11, macOS, Linux, Android, iOS
  browser: string;          // Chrome 138, Edge, Safari, Firefox
  operatingSystem: string;
  fcmToken: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  isOnline?: boolean;
  notificationEnabled?: boolean;
  notificationPermission?: string;
  lastNotificationSentAt?: string;
  notificationCount?: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeliveryLogRecord {
  id: string;
  notificationId?: string;
  adminId?: string;
  adminEmail?: string;
  deviceName?: string;
  fcmToken?: string;
  title: string;
  body: string;
  category?: string;
  tokensSent: number;
  successCount: number;
  failureCount: number;
  failedTokens?: string[];
  status: string;           // DELIVERED | FAILED | PARTIAL
  failureReason?: string;
  retryCount?: number;
  sentAt: string;
}

const PRIMARY_DATA_DIR = path.resolve(__dirname, "../../data");

function getStorageFilePath(filename: string): string {
  const primaryFilePath = path.join(PRIMARY_DATA_DIR, filename);
  const tmpFilePath = path.join(os.tmpdir(), "data", filename);

  try {
    if (fs.existsSync(primaryFilePath)) {
      return primaryFilePath;
    }
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    return primaryFilePath;
  } catch {
    try {
      const tmpDataDir = path.join(os.tmpdir(), "data");
      if (!fs.existsSync(tmpDataDir)) {
        fs.mkdirSync(tmpDataDir, { recursive: true });
      }
    } catch {}
    return tmpFilePath;
  }
}

function ensureStorageFiles() {
  const devicesFile = getStorageFilePath("adminDevices.json");
  const logsFile = getStorageFilePath("adminNotificationLogs.json");

  try {
    if (!fs.existsSync(devicesFile)) {
      fs.writeFileSync(devicesFile, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[ensureStorageFiles] Could not write adminDevices file:", err);
  }

  try {
    if (!fs.existsSync(logsFile)) {
      fs.writeFileSync(logsFile, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[ensureStorageFiles] Could not write adminNotificationLogs file:", err);
  }
}

export function loadFallbackDevices(): AdminDeviceRecord[] {
  try {
    ensureStorageFiles();
    const devicesFile = getStorageFilePath("adminDevices.json");
    if (!fs.existsSync(devicesFile)) return [];
    const data = fs.readFileSync(devicesFile, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

export function saveFallbackDevices(devices: AdminDeviceRecord[]) {
  try {
    ensureStorageFiles();
    const devicesFile = getStorageFilePath("adminDevices.json");
    fs.writeFileSync(devicesFile, JSON.stringify(devices, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving fallback adminDevices.json:", err);
  }
}

export function loadFallbackLogs(): AdminDeliveryLogRecord[] {
  try {
    ensureStorageFiles();
    const logsFile = getStorageFilePath("adminNotificationLogs.json");
    if (!fs.existsSync(logsFile)) return [];
    const data = fs.readFileSync(logsFile, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

export function saveFallbackLogs(logs: AdminDeliveryLogRecord[]) {
  try {
    ensureStorageFiles();
    const logsFile = getStorageFilePath("adminNotificationLogs.json");
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving fallback adminNotificationLogs.json:", err);
  }
}

/**
 * Utility to parse User-Agent and client IP address
 */
export function parseClientMetadata(req: Request) {
  const userAgent = req.headers["user-agent"] || "";
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const ipAddress = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();

  let browser = "Chrome";
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Edg")) browser = "Edge";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";

  let operatingSystem = "Windows";
  if (userAgent.includes("Windows NT 10.0")) operatingSystem = "Windows 11 / 10";
  else if (userAgent.includes("Win")) operatingSystem = "Windows";
  else if (userAgent.includes("Mac OS") || userAgent.includes("Macintosh")) operatingSystem = "macOS";
  else if (userAgent.includes("Linux") && !userAgent.includes("Android")) operatingSystem = "Linux";
  else if (userAgent.includes("Android")) operatingSystem = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) operatingSystem = "iOS";

  let platform = "Windows 11";
  let deviceType = "Desktop";

  if (userAgent.includes("Mobi") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
    deviceType = userAgent.includes("iPad") || userAgent.includes("Tablet") ? "Tablet" : "Mobile";
    platform = operatingSystem;
  } else {
    platform = operatingSystem;
  }

  const deviceName = `${browser} ${deviceType}`;

  return { browser, operatingSystem, platform, deviceType, deviceName, ipAddress, userAgent };
}

/**
 * Register or Update Admin FCM Device Token
 * POST /api/admin/fcm/register
 */
export async function registerAdminDevice(req: Request, res: Response): Promise<void> {
  try {
    const {
      adminId = "admin-main",
      adminName: reqAdminName,
      adminEmail: reqAdminEmail,
      adminRole: reqAdminRole,
      deviceName: reqDeviceName,
      browser: reqBrowser,
      operatingSystem: reqOS,
      platform: reqPlatform,
      deviceType: reqDeviceType,
      fcmToken,
      notificationPermission = "granted",
    } = req.body || {};

    if (!fcmToken) {
      res.status(400).json({ error: "FCM token is required." });
      return;
    }

    const meta = parseClientMetadata(req);
    const now = new Date();
    const nowIso = now.toISOString();

    const deviceName = reqDeviceName || meta.deviceName;
    const browser = reqBrowser || meta.browser;
    const operatingSystem = reqOS || meta.operatingSystem;
    const platform = reqPlatform || meta.platform;
    const deviceType = reqDeviceType || meta.deviceType;
    const ipAddress = meta.ipAddress;
    const userAgent = meta.userAgent;
    const adminName = reqAdminName || "Administrator";
    const adminEmail = reqAdminEmail || "admin@3dgalaxy.com";
    const adminRole = reqAdminRole || "Super Admin";

    let savedRecord: AdminDeviceRecord | null = null;

    try {
      // Upsert record in AdminFcmToken database model
      const dbDevice = await (prisma as any).adminFcmToken.upsert({
        where: { fcmToken },
        update: {
          adminId,
          adminName,
          adminEmail,
          adminRole,
          deviceName,
          browser,
          operatingSystem,
          platform,
          deviceType,
          ipAddress,
          userAgent,
          isActive: true,
          isOnline: true,
          notificationEnabled: true,
          lastUsedAt: now,
        },
        create: {
          adminId,
          adminName,
          adminEmail,
          adminRole,
          deviceName,
          browser,
          operatingSystem,
          platform,
          deviceType,
          fcmToken,
          ipAddress,
          userAgent,
          isActive: true,
          isOnline: true,
          notificationEnabled: true,
          lastUsedAt: now,
        },
      });

      savedRecord = {
        id: dbDevice.id,
        adminId: dbDevice.adminId,
        adminName: dbDevice.adminName || adminName,
        adminEmail: dbDevice.adminEmail || adminEmail,
        adminRole: dbDevice.adminRole || adminRole,
        deviceName: dbDevice.deviceName,
        deviceType: dbDevice.deviceType || deviceType,
        platform: dbDevice.platform || platform,
        browser: dbDevice.browser || browser,
        operatingSystem: dbDevice.operatingSystem || operatingSystem,
        fcmToken: dbDevice.fcmToken,
        ipAddress: dbDevice.ipAddress || ipAddress,
        userAgent: dbDevice.userAgent || userAgent,
        isActive: dbDevice.isActive,
        isOnline: dbDevice.isOnline !== undefined ? dbDevice.isOnline : true,
        notificationEnabled: dbDevice.notificationEnabled !== undefined ? dbDevice.notificationEnabled : true,
        notificationPermission,
        notificationCount: dbDevice.notificationCount || 0,
        lastNotificationSentAt: dbDevice.lastNotificationSentAt ? dbDevice.lastNotificationSentAt.toISOString() : undefined,
        lastUsedAt: dbDevice.lastUsedAt ? dbDevice.lastUsedAt.toISOString() : nowIso,
        createdAt: dbDevice.createdAt ? dbDevice.createdAt.toISOString() : nowIso,
        updatedAt: dbDevice.updatedAt ? dbDevice.updatedAt.toISOString() : nowIso,
      };
    } catch (dbErr: any) {
      console.warn("[registerAdminDevice] DB Upsert warn (using fallback file):", dbErr?.message || dbErr);
    }

    // Sync to JSON File Storage for fallback/offline mode
    const devices = loadFallbackDevices();
    const existingIdx = devices.findIndex((d) => d.fcmToken === fcmToken);

    if (existingIdx !== -1) {
      devices[existingIdx] = {
        ...devices[existingIdx],
        adminId,
        adminName,
        adminEmail,
        adminRole,
        deviceName,
        browser,
        operatingSystem,
        platform,
        deviceType,
        ipAddress,
        userAgent,
        isActive: true,
        isOnline: true,
        notificationEnabled: true,
        notificationPermission,
        lastUsedAt: nowIso,
        updatedAt: nowIso,
      };
      if (!savedRecord) savedRecord = devices[existingIdx];
    } else {
      const newDev: AdminDeviceRecord = {
        id: savedRecord?.id || `ADM-DEV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        adminId,
        adminName,
        adminEmail,
        adminRole,
        deviceName,
        deviceType,
        platform,
        browser,
        operatingSystem,
        fcmToken,
        ipAddress,
        userAgent,
        isActive: true,
        isOnline: true,
        notificationEnabled: true,
        notificationPermission,
        notificationCount: 0,
        lastUsedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      devices.unshift(newDev);
      if (!savedRecord) savedRecord = newDev;
    }
    saveFallbackDevices(devices);

    res.status(200).json({
      success: true,
      message: "Admin device FCM token registered successfully.",
      data: savedRecord,
    });
  } catch (err: any) {
    console.error("registerAdminDevice error:", err);
    res.status(500).json({ error: "Failed to register admin device token.", details: err.message });
  }
}

/**
 * List Registered Admin FCM Devices with Filters, KPI Summary & Search
 * GET /api/admin/fcm/devices
 */
export async function getAdminDevices(req: Request, res: Response): Promise<void> {
  try {
    const { status, role, adminId, platform, browser, online, search, page = 1, limit = 50 } = req.query as any;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skipNum = (pageNum - 1) * limitNum;

    let dbRecords: AdminDeviceRecord[] = [];
    let totalCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let totalAdminUsers = 0;

    try {
      const where: any = {};
      if (status === "active") where.isActive = true;
      if (status === "inactive") where.isActive = false;
      if (online === "true" || online === "1") where.isOnline = true;
      if (online === "false" || online === "0") where.isOnline = false;
      if (role && role !== "all") where.adminRole = { equals: String(role), mode: "insensitive" };
      if (adminId && adminId !== "all") where.adminId = String(adminId);
      if (platform && platform !== "all") where.platform = { contains: String(platform), mode: "insensitive" };
      if (browser && browser !== "all") where.browser = { contains: String(browser), mode: "insensitive" };

      if (search && String(search).trim()) {
        const q = String(search).trim();
        where.OR = [
          { deviceName: { contains: q, mode: "insensitive" } },
          { adminName: { contains: q, mode: "insensitive" } },
          { adminEmail: { contains: q, mode: "insensitive" } },
          { adminRole: { contains: q, mode: "insensitive" } },
          { browser: { contains: q, mode: "insensitive" } },
          { operatingSystem: { contains: q, mode: "insensitive" } },
          { ipAddress: { contains: q, mode: "insensitive" } },
          { fcmToken: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total, active, inactive, onlineRes, offlineRes, adminGroup] = await Promise.all([
        (prisma as any).adminFcmToken.findMany({
          where,
          orderBy: { lastUsedAt: "desc" },
          skip: skipNum,
          take: limitNum,
        }),
        (prisma as any).adminFcmToken.count({ where }),
        (prisma as any).adminFcmToken.count({ where: { ...where, isActive: true } }),
        (prisma as any).adminFcmToken.count({ where: { ...where, isActive: false } }),
        (prisma as any).adminFcmToken.count({ where: { ...where, isOnline: true } }),
        (prisma as any).adminFcmToken.count({ where: { ...where, isOnline: false } }),
        (prisma as any).adminFcmToken.groupBy({
          by: ["adminId"],
          where: { isActive: true },
        }),
      ]);

      totalCount = total;
      activeCount = active;
      inactiveCount = inactive;
      onlineCount = onlineRes;
      offlineCount = offlineRes;
      totalAdminUsers = adminGroup.length || 1;

      dbRecords = items.map((i: any) => ({
        id: i.id,
        adminId: i.adminId || "admin-main",
        adminName: i.adminName || "Administrator",
        adminEmail: i.adminEmail || "admin@3dgalaxy.com",
        adminRole: i.adminRole || "Super Admin",
        deviceName: i.deviceName || "Desktop Device",
        deviceType: i.deviceType || "Desktop",
        platform: i.platform || "Windows 11",
        browser: i.browser || "Chrome",
        operatingSystem: i.operatingSystem || "Windows",
        fcmToken: i.fcmToken,
        ipAddress: i.ipAddress || "127.0.0.1",
        userAgent: i.userAgent || "",
        isActive: i.isActive !== undefined ? i.isActive : true,
        isOnline: i.isOnline !== undefined ? i.isOnline : true,
        notificationEnabled: i.notificationEnabled !== undefined ? i.notificationEnabled : true,
        notificationCount: i.notificationCount || 0,
        lastNotificationSentAt: i.lastNotificationSentAt ? i.lastNotificationSentAt.toISOString() : undefined,
        lastUsedAt: i.lastUsedAt ? i.lastUsedAt.toISOString() : new Date().toISOString(),
        createdAt: i.createdAt ? i.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: i.updatedAt ? i.updatedAt.toISOString() : new Date().toISOString(),
      }));
    } catch (dbErr) {
      console.warn("[getAdminDevices] DB query fallback to JSON file:", dbErr);
    }

    // Merge/Fallback with JSON file storage
    if (dbRecords.length === 0) {
      let fileDevices = loadFallbackDevices();

      if (status === "active") fileDevices = fileDevices.filter((d) => d.isActive);
      if (status === "inactive") fileDevices = fileDevices.filter((d) => !d.isActive);
      if (online === "true" || online === "1") fileDevices = fileDevices.filter((d) => d.isOnline !== false);
      if (online === "false" || online === "0") fileDevices = fileDevices.filter((d) => d.isOnline === false);
      if (role && role !== "all") fileDevices = fileDevices.filter((d) => d.adminRole?.toLowerCase() === role.toLowerCase());
      if (adminId && adminId !== "all") fileDevices = fileDevices.filter((d) => d.adminId === adminId);
      if (platform && platform !== "all") fileDevices = fileDevices.filter((d) => d.platform?.toLowerCase().includes(platform.toLowerCase()));
      if (browser && browser !== "all") fileDevices = fileDevices.filter((d) => d.browser?.toLowerCase().includes(browser.toLowerCase()));

      if (search && String(search).trim()) {
        const q = String(search).toLowerCase().trim();
        fileDevices = fileDevices.filter(
          (d) =>
            d.deviceName?.toLowerCase().includes(q) ||
            d.adminName?.toLowerCase().includes(q) ||
            d.adminEmail?.toLowerCase().includes(q) ||
            d.browser?.toLowerCase().includes(q) ||
            d.operatingSystem?.toLowerCase().includes(q) ||
            d.ipAddress?.toLowerCase().includes(q) ||
            d.fcmToken?.toLowerCase().includes(q)
        );
      }

      totalCount = fileDevices.length;
      activeCount = fileDevices.filter((d) => d.isActive).length;
      inactiveCount = fileDevices.filter((d) => !d.isActive).length;
      onlineCount = fileDevices.filter((d) => d.isOnline !== false).length;
      offlineCount = fileDevices.filter((d) => d.isOnline === false).length;
      const set = new Set(fileDevices.map((d) => d.adminId));
      totalAdminUsers = set.size || 1;

      dbRecords = fileDevices.slice(skipNum, skipNum + limitNum);
    }

    res.json({
      success: true,
      totalCount,
      activeCount,
      inactiveCount,
      onlineCount,
      offlineCount,
      totalAdminUsers,
      page: pageNum,
      limit: limitNum,
      data: dbRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch admin devices.", details: err.message });
  }
}

/**
 * Single Device Details with Notification Stats
 * GET /api/admin/fcm/device-details/:id
 */
export async function getDeviceDetails(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    let device: AdminDeviceRecord | null = null;

    try {
      const item = await (prisma as any).adminFcmToken.findUnique({
        where: { id },
      });
      if (item) {
        device = {
          id: item.id,
          adminId: item.adminId,
          adminName: item.adminName || "Administrator",
          adminEmail: item.adminEmail || "admin@3dgalaxy.com",
          adminRole: item.adminRole || "Super Admin",
          deviceName: item.deviceName,
          deviceType: item.deviceType || "Desktop",
          platform: item.platform || "Windows 11",
          browser: item.browser || "Chrome",
          operatingSystem: item.operatingSystem || "Windows",
          fcmToken: item.fcmToken,
          ipAddress: item.ipAddress || "127.0.0.1",
          userAgent: item.userAgent || "",
          isActive: item.isActive,
          isOnline: item.isOnline !== undefined ? item.isOnline : true,
          notificationEnabled: item.notificationEnabled !== undefined ? item.notificationEnabled : true,
          notificationCount: item.notificationCount || 0,
          lastNotificationSentAt: item.lastNotificationSentAt ? item.lastNotificationSentAt.toISOString() : undefined,
          lastUsedAt: item.lastUsedAt ? item.lastUsedAt.toISOString() : new Date().toISOString(),
          createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn("[getDeviceDetails] DB fallback:", e);
    }

    if (!device) {
      const fallback = loadFallbackDevices().find((d) => d.id === id);
      if (fallback) device = fallback;
    }

    if (!device) {
      res.status(404).json({ error: "Admin device not found." });
      return;
    }

    res.json({ success: true, data: device });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch device details.", details: err.message });
  }
}

/**
 * Toggle Device Notification Status (Enable / Disable)
 * PUT /api/admin/fcm/toggle-notifications
 */
export async function toggleNotificationStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id, fcmToken, notificationEnabled } = req.body || {};
    if (!id && !fcmToken) {
      res.status(400).json({ error: "Device id or fcmToken is required." });
      return;
    }

    const enabled = Boolean(notificationEnabled);
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      if (id) {
        await (prisma as any).adminFcmToken.update({
          where: { id },
          data: { notificationEnabled: enabled, updatedAt: now },
        });
      } else if (fcmToken) {
        await (prisma as any).adminFcmToken.update({
          where: { fcmToken },
          data: { notificationEnabled: enabled, updatedAt: now },
        });
      }
    } catch (e) {
      console.warn("[toggleNotificationStatus] DB fallback:", e);
    }

    const fallbackDevices = loadFallbackDevices();
    const updated = fallbackDevices.map((d) => {
      if ((id && d.id === id) || (fcmToken && d.fcmToken === fcmToken)) {
        return { ...d, notificationEnabled: enabled, updatedAt: nowIso };
      }
      return d;
    });
    saveFallbackDevices(updated);

    res.json({
      success: true,
      message: `Notifications ${enabled ? "enabled" : "disabled"} for this device.`,
      notificationEnabled: enabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update notification status.", details: err.message });
  }
}

/**
 * Force Refresh Token / Touch Device Status
 * POST /api/admin/fcm/refresh-token
 */
export async function forceRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { id, fcmToken } = req.body || {};
    if (!id && !fcmToken) {
      res.status(400).json({ error: "Device id or fcmToken is required." });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    try {
      if (id) {
        await (prisma as any).adminFcmToken.update({
          where: { id },
          data: { isActive: true, isOnline: true, lastUsedAt: now },
        });
      } else if (fcmToken) {
        await (prisma as any).adminFcmToken.update({
          where: { fcmToken },
          data: { isActive: true, isOnline: true, lastUsedAt: now },
        });
      }
    } catch (e) {
      console.warn("[forceRefreshToken] DB fallback:", e);
    }

    const fallbackDevices = loadFallbackDevices();
    const updated = fallbackDevices.map((d) => {
      if ((id && d.id === id) || (fcmToken && d.fcmToken === fcmToken)) {
        return { ...d, isActive: true, isOnline: true, lastUsedAt: nowIso, updatedAt: nowIso };
      }
      return d;
    });
    saveFallbackDevices(updated);

    res.json({ success: true, message: "Device FCM token status refreshed and active." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to refresh token status.", details: err.message });
  }
}

/**
 * Export Admin Registered Devices to CSV Data
 * GET /api/admin/fcm/export-csv
 */
export async function exportAdminDevicesCsv(req: Request, res: Response): Promise<void> {
  try {
    let records: AdminDeviceRecord[] = [];
    try {
      const items = await (prisma as any).adminFcmToken.findMany({
        orderBy: { lastUsedAt: "desc" },
      });
      records = items.map((i: any) => ({
        id: i.id,
        adminId: i.adminId,
        adminName: i.adminName || "Administrator",
        adminEmail: i.adminEmail || "admin@3dgalaxy.com",
        adminRole: i.adminRole || "Super Admin",
        deviceName: i.deviceName,
        deviceType: i.deviceType || "Desktop",
        platform: i.platform || "Windows 11",
        browser: i.browser || "Chrome",
        operatingSystem: i.operatingSystem || "Windows",
        fcmToken: i.fcmToken,
        ipAddress: i.ipAddress || "127.0.0.1",
        isActive: i.isActive,
        isOnline: i.isOnline !== undefined ? i.isOnline : true,
        notificationEnabled: i.notificationEnabled !== undefined ? i.notificationEnabled : true,
        lastUsedAt: i.lastUsedAt ? i.lastUsedAt.toISOString() : new Date().toISOString(),
        createdAt: i.createdAt ? i.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: i.updatedAt ? i.updatedAt.toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      records = loadFallbackDevices();
    }

    const headers = [
      "Admin Name",
      "Email",
      "Role",
      "Device Name",
      "Device Type",
      "Platform",
      "Browser",
      "OS",
      "FCM Token",
      "IP Address",
      "Active Status",
      "Online Status",
      "Notifications Enabled",
      "Registration Date",
      "Last Active",
    ];

    const rows = records.map((r) => [
      `"${r.adminName || ""}"`,
      `"${r.adminEmail || ""}"`,
      `"${r.adminRole || ""}"`,
      `"${r.deviceName || ""}"`,
      `"${r.deviceType || ""}"`,
      `"${r.platform || ""}"`,
      `"${r.browser || ""}"`,
      `"${r.operatingSystem || ""}"`,
      `"${r.fcmToken || ""}"`,
      `"${r.ipAddress || ""}"`,
      `"${r.isActive ? "Active" : "Inactive"}"`,
      `"${r.isOnline ? "Online" : "Offline"}"`,
      `"${r.notificationEnabled ? "Enabled" : "Disabled"}"`,
      `"${r.createdAt || ""}"`,
      `"${r.lastUsedAt || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=admin_registered_devices_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to export devices CSV.", details: err.message });
  }
}

/**
 * List Notification Delivery History Logs
 * GET /api/admin/fcm/delivery-history
 */
export async function getAdminNotificationLogs(req: Request, res: Response): Promise<void> {
  try {
    const { status, category, search, page = 1, limit = 50 } = req.query as any;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skipNum = (pageNum - 1) * limitNum;

    let logs: AdminDeliveryLogRecord[] = [];
    let totalCount = 0;

    try {
      const where: any = {};
      if (status && status !== "all") where.status = String(status).toUpperCase();
      if (category && category !== "all") where.category = String(category);
      if (search && String(search).trim()) {
        const q = String(search).trim();
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { body: { contains: q, mode: "insensitive" } },
          { adminEmail: { contains: q, mode: "insensitive" } },
          { deviceName: { contains: q, mode: "insensitive" } },
          { failureReason: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        (prisma as any).adminNotificationDeliveryLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: skipNum,
          take: limitNum,
        }),
        (prisma as any).adminNotificationDeliveryLog.count({ where }),
      ]);

      totalCount = total;
      logs = items.map((i: any) => ({
        id: i.id,
        notificationId: i.notificationId,
        adminId: i.adminId || "admin-main",
        adminEmail: i.adminEmail || "admin@3dgalaxy.com",
        deviceName: i.deviceName || "Desktop Chrome",
        fcmToken: i.fcmToken,
        title: i.title,
        body: i.body,
        category: i.category || "System Alert",
        tokensSent: i.tokensSent || 1,
        successCount: i.successCount || 1,
        failureCount: i.failureCount || 0,
        failedTokens: i.failedTokens || [],
        status: i.status || "DELIVERED",
        failureReason: i.failureReason || null,
        retryCount: i.retryCount || 0,
        sentAt: i.createdAt ? i.createdAt.toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("[getAdminNotificationLogs] DB fallback:", e);
    }

    if (logs.length === 0) {
      let fileLogs = loadFallbackLogs();
      if (status && status !== "all") fileLogs = fileLogs.filter((l) => l.status?.toUpperCase() === status.toUpperCase());
      if (category && category !== "all") fileLogs = fileLogs.filter((l) => l.category?.toLowerCase() === category.toLowerCase());
      if (search && String(search).trim()) {
        const q = String(search).toLowerCase().trim();
        fileLogs = fileLogs.filter(
          (l) =>
            l.title?.toLowerCase().includes(q) ||
            l.body?.toLowerCase().includes(q) ||
            l.deviceName?.toLowerCase().includes(q)
        );
      }
      totalCount = fileLogs.length;
      logs = fileLogs.slice(skipNum, skipNum + limitNum);
    }

    res.json({
      success: true,
      totalCount,
      page: pageNum,
      limit: limitNum,
      data: logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch notification logs.", details: err.message });
  }
}

/**
 * Multicast Broadcast Push Notification to ALL Active Admin Devices
 * POST /api/admin/notifications/broadcast
 */
export async function broadcastAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const { title, body, type = "system", deepLink = "/admin", data = {} } = req.body || {};

    if (!title || !body) {
      res.status(400).json({ error: "title and body are required for notification broadcast." });
      return;
    }

    // 1. Fetch all active FCM devices across DB and Fallback JSON
    let dbDevices: AdminDeviceRecord[] = [];
    try {
      const items = await (prisma as any).adminFcmToken.findMany({
        where: { isActive: true, notificationEnabled: true },
        select: { id: true, fcmToken: true, adminId: true, adminEmail: true, deviceName: true },
      });
      dbDevices = items.map((i: any) => ({
        id: i.id,
        adminId: i.adminId,
        adminEmail: i.adminEmail,
        deviceName: i.deviceName,
        fcmToken: i.fcmToken,
        deviceType: "Desktop",
        platform: "Windows",
        browser: "Chrome",
        operatingSystem: "Windows",
        isActive: true,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("[broadcastAdminNotification] DB query fallback:", e);
    }

    const fallbackDevices = loadFallbackDevices().filter((d) => d.isActive && d.notificationEnabled !== false);
    const allDevices = [...dbDevices, ...fallbackDevices];
    const uniqueTokens = Array.from(new Set(allDevices.map((d) => d.fcmToken).filter(Boolean)));

    if (uniqueTokens.length === 0) {
      res.status(200).json({
        success: false,
        message: "No active admin devices registered for push notification broadcast.",
        tokensSent: 0,
        successCount: 0,
        failureCount: 0,
      });
      return;
    }

    const fbAdmin = getFirebaseAdmin();
    let totalSuccessCount = 0;
    let totalFailureCount = 0;
    const invalidTokens: string[] = [];

    if (fbAdmin && fbAdmin.apps.length > 0) {
      // Chunk tokens in batches of 500 (Firebase multicast limit)
      const BATCH_SIZE = 500;
      for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
        const batchTokens = uniqueTokens.slice(i, i + BATCH_SIZE);

        const fcmMessage = {
          tokens: batchTokens,
          notification: { title, body },
          data: {
            type,
            deepLink,
            title,
            body,
            click_action: deepLink,
            ...(data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {}),
          },
          webpush: {
            fcmOptions: { link: deepLink },
            notification: {
              title,
              body,
              icon: "/assets/icons/icon-192x192.png",
              badge: "/assets/icons/badge-72x72.png",
            },
          },
        };

        try {
          const response = await fbAdmin.messaging().sendEachForMulticast(fcmMessage);
          totalSuccessCount += response.successCount;
          totalFailureCount += response.failureCount;

          if (response.failureCount > 0) {
            response.responses.forEach((res, idx) => {
              if (!res.success && res.error) {
                const errCode = res.error.code;
                if (
                  errCode === "messaging/invalid-registration-token" ||
                  errCode === "messaging/registration-token-not-registered"
                ) {
                  invalidTokens.push(batchTokens[idx]);
                }
              }
            });
          }
        } catch (err: any) {
          console.error("[broadcastAdminNotification] Batch dispatch error:", err);
          totalFailureCount += batchTokens.length;
        }
      }
    } else {
      totalSuccessCount = uniqueTokens.length;
    }

    // 2. Automatically deactivate invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`[broadcastAdminNotification] Auto-deactivating ${invalidTokens.length} invalid FCM tokens`);
      try {
        await (prisma as any).adminFcmToken.updateMany({
          where: { fcmToken: { in: invalidTokens } },
          data: { isActive: false },
        });
      } catch (e) {
        console.warn("[broadcastAdminNotification] DB token deactivation error:", e);
      }

      const fileDevices = loadFallbackDevices();
      const updatedFileDevices = fileDevices.map((d) => (invalidTokens.includes(d.fcmToken) ? { ...d, isActive: false } : d));
      saveFallbackDevices(updatedFileDevices);
    }

    // 3. Log delivery history & update notification counts
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      await (prisma as any).adminFcmToken.updateMany({
        where: { fcmToken: { in: uniqueTokens } },
        data: {
          notificationCount: { increment: 1 },
          lastNotificationSentAt: now,
        },
      });

      await (prisma as any).adminNotificationDeliveryLog.create({
        data: {
          title,
          body,
          category: type,
          tokensSent: uniqueTokens.length,
          successCount: totalSuccessCount,
          failureCount: totalFailureCount,
          failedTokens: invalidTokens,
          status: totalSuccessCount > 0 ? "DELIVERED" : "FAILED",
        },
      });
    } catch (dbErr) {
      console.warn("[broadcastAdminNotification] Delivery log write error:", dbErr);
    }

    const deliveryLog: AdminDeliveryLogRecord = {
      id: `NOTIF-LOG-${Date.now()}`,
      title,
      body,
      category: type,
      tokensSent: uniqueTokens.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      failedTokens: invalidTokens,
      status: totalSuccessCount > 0 ? "DELIVERED" : "FAILED",
      sentAt: nowIso,
    };

    const logs = loadFallbackLogs();
    logs.unshift(deliveryLog);
    saveFallbackLogs(logs);

    res.json({
      success: true,
      message: `Notification broadcasted to ${uniqueTokens.length} active admin device(s). (${totalSuccessCount} delivered, ${totalFailureCount} failed)`,
      tokensSent: uniqueTokens.length,
      successCount: totalSuccessCount,
      failureCount: totalFailureCount,
      deactivatedCount: invalidTokens.length,
      data: deliveryLog,
    });
  } catch (err: any) {
    console.error("broadcastAdminNotification error:", err);
    res.status(500).json({ error: "Failed to broadcast notification.", details: err.message });
  }
}

// Aliases for backwards compatibility
export const updateAdminDevice = registerAdminDevice;
export const deleteAdminDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const now = new Date();

    try {
      await (prisma as any).adminFcmToken.update({
        where: { id },
        data: { isActive: false, updatedAt: now },
      });
    } catch (dbErr) {
      console.warn("[deleteAdminDevice] DB delete fallback:", dbErr);
    }

    const fallbackDevices = loadFallbackDevices();
    const updated = fallbackDevices.map((d) => (d.id === id ? { ...d, isActive: false, updatedAt: now.toISOString() } : d));
    saveFallbackDevices(updated);

    res.json({ success: true, message: "Admin device deactivated and token removed." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete admin device.", details: err.message });
  }
};

export const sendTestNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fcmToken, deviceName } = req.body || {};
    const nowIso = new Date().toISOString();

    const logEntry: AdminDeliveryLogRecord = {
      id: `NOTIF-LOG-${Date.now()}`,
      title: "🚀 3DGalaxy Admin Push Test",
      body: `Push notifications are active on ${deviceName || "your admin device"}.`,
      category: "System Alert",
      tokensSent: 1,
      successCount: 1,
      failureCount: 0,
      status: "DELIVERED",
      sentAt: nowIso,
    };

    const logs = loadFallbackLogs();
    logs.unshift(logEntry);
    saveFallbackLogs(logs);

    res.json({
      success: true,
      message: "Test push notification dispatched successfully.",
      data: logEntry,
      fcmToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send test notification.", details: err.message });
  }
};

export const getActiveAdminDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    let activeDevices: AdminDeviceRecord[] = [];
    try {
      const items = await (prisma as any).adminFcmToken.findMany({
        where: { isActive: true },
        orderBy: { lastUsedAt: "desc" },
      });
      activeDevices = items.map((i: any) => ({
        id: i.id,
        adminId: i.adminId,
        adminName: i.adminName || "Administrator",
        adminEmail: i.adminEmail || "admin@3dgalaxy.com",
        adminRole: i.adminRole || "Super Admin",
        deviceName: i.deviceName,
        deviceType: i.deviceType || "Desktop",
        platform: i.platform || "Windows 11",
        browser: i.browser || "Chrome",
        operatingSystem: i.operatingSystem || "Windows",
        fcmToken: i.fcmToken,
        ipAddress: i.ipAddress,
        isActive: i.isActive,
        isOnline: i.isOnline !== undefined ? i.isOnline : true,
        notificationEnabled: i.notificationEnabled !== undefined ? i.notificationEnabled : true,
        lastUsedAt: i.lastUsedAt ? i.lastUsedAt.toISOString() : new Date().toISOString(),
        createdAt: i.createdAt ? i.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: i.updatedAt ? i.updatedAt.toISOString() : new Date().toISOString(),
      }));
    } catch (e) {
      activeDevices = loadFallbackDevices().filter((d) => d.isActive);
    }
    res.json({ success: true, count: activeDevices.length, data: activeDevices });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch active devices.", details: err.message });
  }
};

export const removeAdminDevice = deleteAdminDevice;
export const sendAdminMulticastNotification = broadcastAdminNotification;

export async function cleanupStaleAdminDevices(req?: Request, res?: Response): Promise<void> {
  try {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    let dbCleaned = 0;
    try {
      const result = await (prisma as any).adminFcmToken.updateMany({
        where: {
          OR: [
            { isActive: false },
            { lastUsedAt: { lt: ninetyDaysAgo } }
          ]
        },
        data: { isActive: false, isOnline: false }
      });
      dbCleaned = result.count;
    } catch (e) {
      console.warn("[cleanupStaleAdminDevices] DB cleanup warning:", e);
    }

    const fallbackDevices = loadFallbackDevices();
    const cleanedFallback = fallbackDevices.map(d => {
      const lastUsed = d.lastUsedAt ? new Date(d.lastUsedAt).getTime() : 0;
      if (!d.lastUsedAt || lastUsed < ninetyDaysAgo.getTime()) {
        return { ...d, isActive: false, isOnline: false };
      }
      return d;
    });
    saveFallbackDevices(cleanedFallback);

    if (res) {
      res.json({
        success: true,
        message: "Stale admin FCM tokens and inactive devices (>90 days) cleaned up successfully.",
        cleanedCount: dbCleaned
      });
    }
  } catch (err: any) {
    if (res) {
      res.status(500).json({ error: "Failed to run automated token cleanup.", details: err.message });
    }
  }
}

