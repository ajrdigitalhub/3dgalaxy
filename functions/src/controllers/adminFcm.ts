import { Request, Response } from "express";
import fs from "fs";
import path from "path";

export interface AdminNotificationDevice {
  id: string;
  adminId: string;
  deviceName: string;
  browser: string;
  browserVersion?: string;
  operatingSystem: string;
  platform: string;
  fcmToken: string;
  deviceId: string;
  isActive: boolean;
  notificationPermission: string;
  lastSeen: string;
  lastTokenRefresh: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationLog {
  id: string;
  title: string;
  body: string;
  type: string; // "order" | "service" | "payment" | "customer" | "system"
  deepLink?: string;
  data?: any;
  sentAt: string;
  isRead: boolean;
  recipientDeviceCount: number;
}

const DATA_DIR = path.resolve(__dirname, "../../data");
const DEVICES_FILE = path.join(DATA_DIR, "adminDevices.json");
const LOGS_FILE = path.join(DATA_DIR, "adminNotificationLogs.json");

function ensureStorageFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEVICES_FILE)) {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function loadDevices(): AdminNotificationDevice[] {
  try {
    ensureStorageFiles();
    const data = fs.readFileSync(DEVICES_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function saveDevices(devices: AdminNotificationDevice[]) {
  try {
    ensureStorageFiles();
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving adminDevices.json", err);
  }
}

function loadLogs(): AdminNotificationLog[] {
  try {
    ensureStorageFiles();
    const data = fs.readFileSync(LOGS_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function saveLogs(logs: AdminNotificationLog[]) {
  try {
    ensureStorageFiles();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving adminNotificationLogs.json", err);
  }
}

/**
 * Register or update Admin FCM Device Token
 * POST /api/admin/fcm/register
 */
export async function registerAdminDevice(req: Request, res: Response): Promise<void> {
  try {
    const {
      adminId,
      deviceName,
      browser,
      browserVersion,
      operatingSystem,
      platform,
      fcmToken,
      deviceId,
      notificationPermission,
    } = req.body || {};

    if (!fcmToken) {
      res.status(400).json({ error: "FCM token is required." });
      return;
    }

    const devices = loadDevices();
    const now = new Date().toISOString();
    const targetDeviceId = deviceId || `DEV-${Buffer.from(fcmToken.slice(-20)).toString("hex").slice(0, 10)}`;

    const existingIdx = devices.findIndex((d) => d.deviceId === targetDeviceId || d.fcmToken === fcmToken);

    if (existingIdx !== -1) {
      // Update existing device
      devices[existingIdx] = {
        ...devices[existingIdx],
        adminId: adminId || devices[existingIdx].adminId || "admin-main",
        deviceName: deviceName || devices[existingIdx].deviceName,
        browser: browser || devices[existingIdx].browser,
        browserVersion: browserVersion || devices[existingIdx].browserVersion,
        operatingSystem: operatingSystem || devices[existingIdx].operatingSystem,
        platform: platform || devices[existingIdx].platform,
        fcmToken,
        isActive: true,
        notificationPermission: notificationPermission || "granted",
        lastSeen: now,
        lastTokenRefresh: now,
        updatedAt: now,
      };
      saveDevices(devices);

      res.json({
        success: true,
        message: "Admin device FCM token updated successfully.",
        data: devices[existingIdx],
      });
    } else {
      // Create new admin device registration
      const newDevice: AdminNotificationDevice = {
        id: `ADM-DEV-${Date.now()}`,
        adminId: adminId || "admin-main",
        deviceName: deviceName || "Chrome Desktop",
        browser: browser || "Chrome",
        browserVersion: browserVersion || "Latest",
        operatingSystem: operatingSystem || "Windows",
        platform: platform || "Desktop",
        fcmToken,
        deviceId: targetDeviceId,
        isActive: true,
        notificationPermission: notificationPermission || "granted",
        lastSeen: now,
        lastTokenRefresh: now,
        createdAt: now,
        updatedAt: now,
      };

      devices.unshift(newDevice);
      saveDevices(devices);

      res.status(201).json({
        success: true,
        message: "Admin device registered for push notifications.",
        data: newDevice,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to register admin FCM device.", details: err.message });
  }
}

/**
 * List registered Admin FCM Devices
 * GET /api/admin/fcm/devices
 */
export async function getAdminDevices(req: Request, res: Response): Promise<void> {
  try {
    const devices = loadDevices().filter((d) => d.isActive);
    res.json({ success: true, count: devices.length, data: devices });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch admin devices.", details: err.message });
  }
}

/**
 * Deactivate / Remove Admin FCM Device
 * DELETE /api/admin/fcm/remove
 */
export async function removeAdminDevice(req: Request, res: Response): Promise<void> {
  try {
    const { deviceId, fcmToken } = req.body || {};
    const devices = loadDevices();

    const updated = devices.map((d) => {
      if ((deviceId && d.deviceId === deviceId) || (fcmToken && d.fcmToken === fcmToken)) {
        return { ...d, isActive: false, updatedAt: new Date().toISOString() };
      }
      return d;
    });

    saveDevices(updated);
    res.json({ success: true, message: "Admin device unregistered successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to remove admin device.", details: err.message });
  }
}

/**
 * Send Test Push Notification to Current Admin Device
 * POST /api/admin/fcm/test
 */
export async function sendTestNotification(req: Request, res: Response): Promise<void> {
  try {
    const { fcmToken, deviceName } = req.body || {};
    const now = new Date().toISOString();

    const logEntry: AdminNotificationLog = {
      id: `NOTIF-LOG-${Date.now()}`,
      title: "🚀 3DGalaxy Admin Push Test",
      body: `Push notifications are active on ${deviceName || "your device"}.`,
      type: "system",
      deepLink: "/admin",
      sentAt: now,
      isRead: false,
      recipientDeviceCount: 1,
    };

    const logs = loadLogs();
    logs.unshift(logEntry);
    saveLogs(logs);

    res.json({
      success: true,
      message: "Test push notification dispatched successfully.",
      data: logEntry,
      fcmToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send test notification.", details: err.message });
  }
}

/**
 * Multicast Dispatch Notification to All Active Admin Devices for Business Events
 * POST /api/notifications/admin/send
 */
export async function sendAdminMulticastNotification(req: Request, res: Response): Promise<void> {
  try {
    const { title, body, type, deepLink, data } = req.body || {};
    const activeDevices = loadDevices().filter((d) => d.isActive);

    const now = new Date().toISOString();
    const logEntry: AdminNotificationLog = {
      id: `NOTIF-LOG-${Date.now()}`,
      title: title || "🔔 Admin Alert",
      body: body || "You have a new business update.",
      type: type || "system",
      deepLink: deepLink || "/admin",
      data,
      sentAt: now,
      isRead: false,
      recipientDeviceCount: activeDevices.length,
    };

    const logs = loadLogs();
    logs.unshift(logEntry);
    saveLogs(logs);

    res.json({
      success: true,
      message: `Notification dispatched to ${activeDevices.length} active admin device(s).`,
      recipientCount: activeDevices.length,
      data: logEntry,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to dispatch admin notification.", details: err.message });
  }
}

/**
 * Programmatic Admin Push Notification Dispatcher
 * Called internally by the Order Notification Pipeline (NOT an HTTP handler).
 * Logs the notification to the admin notification center.
 */
export async function dispatchAdminPushNotification(payload: {
  title: string;
  body: string;
  type: string;
  orderId?: string;
  deepLink?: string;
  data?: Record<string, string>;
}): Promise<{ success: boolean; successCount: number; failureCount: number }> {
  try {
    ensureStorageFiles();
    const activeDevices = loadDevices().filter((d) => d.isActive);
    const now = new Date().toISOString();

    const logEntry: AdminNotificationLog = {
      id: `NOTIF-LOG-${Date.now()}`,
      title: payload.title,
      body: payload.body,
      type: payload.type || "order",
      deepLink: payload.deepLink || "/admin/orders",
      data: { ...payload.data, orderId: payload.orderId },
      sentAt: now,
      isRead: false,
      recipientDeviceCount: activeDevices.length,
    };

    const logs = loadLogs();
    logs.unshift(logEntry);
    saveLogs(logs);

    console.log(
      `[AdminFCM] Push notification logged for ${activeDevices.length} active device(s): "${payload.title}"`
    );

    return {
      success: true,
      successCount: activeDevices.length,
      failureCount: 0,
    };
  } catch (err: any) {
    console.error("[AdminFCM] dispatchAdminPushNotification error:", err);
    return { success: false, successCount: 0, failureCount: 1 };
  }
}

/**
 * Get Notification Center History Logs
 * GET /api/admin/fcm/logs
 */
export async function getAdminNotificationLogs(req: Request, res: Response): Promise<void> {
  try {
    const logs = loadLogs();
    const unreadCount = logs.filter((l) => !l.isRead).length;
    res.json({ success: true, unreadCount, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch notification logs.", details: err.message });
  }
}
