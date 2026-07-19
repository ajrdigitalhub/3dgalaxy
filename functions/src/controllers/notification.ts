import { Request, Response } from "express";
import prisma from "../config/database";
import { getFirebaseAdmin } from "../config/firebase";

// Helper to safely get Messaging service
const getMessaging = () => {
  try {
    const admin = getFirebaseAdmin();
    if (admin) return admin.messaging();
  } catch (error) {
    console.error("Firebase Admin Messaging not initialized:", error);
  }
  return null;
};

// 1. Register or Update Device Token
export const registerDevice = async (req: Request, res: Response) => {
  const {
    userId,
    guestId,
    sessionId,
    fcmToken,
    browser,
    device,
    os,
    appVersion,
    language,
    country,
    notificationEnabled,
  } = req.body;

  if (!fcmToken) {
    return res
      .status(400)
      .json({
        status: "error",
        success: false,
        message: "FCM Token is required.",
        error: "FCM Token is required.",
      });
  }

  try {
    const existing = await prisma.notificationDevice.findUnique({
      where: { fcmToken },
    });

    if (existing) {
      const updated = await prisma.notificationDevice.update({
        where: { id: existing.id },
        data: {
          userId: userId !== undefined ? userId : existing.userId,
          guestId: guestId !== undefined ? guestId : existing.guestId,
          sessionId: sessionId !== undefined ? sessionId : existing.sessionId,
          browser: browser || existing.browser,
          device: device || existing.device,
          os: os || existing.os,
          appVersion: appVersion || existing.appVersion,
          language: language || existing.language,
          country: country || existing.country,
          notificationEnabled:
            notificationEnabled !== undefined
              ? notificationEnabled
              : existing.notificationEnabled,
          lastActive: new Date(),
        },
      });
      return res
        .status(200)
        .json({
          status: "success",
          success: true,
          message: "Device token updated.",
          data: updated,
        });
    }

    const created = await prisma.notificationDevice.create({
      data: {
        userId,
        guestId,
        sessionId,
        fcmToken,
        browser,
        device,
        os,
        appVersion,
        language,
        country,
        notificationEnabled:
          notificationEnabled !== undefined ? notificationEnabled : true,
        lastActive: new Date(),
      },
    });

    return res
      .status(201)
      .json({
        status: "success",
        success: true,
        message: "Device registered successfully.",
        data: created,
      });
  } catch (error: any) {
    console.error("Failed to register device:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to register device.",
        error: "Failed to register device.",
        details: error.message,
      });
  }
};

// 2. Update/Refresh Token
export const updateToken = async (req: Request, res: Response) => {
  const { oldToken, newToken } = req.body;

  if (!oldToken || !newToken) {
    return res
      .status(400)
      .json({
        status: "error",
        success: false,
        message: "Both oldToken and newToken are required.",
        error: "Both oldToken and newToken are required.",
      });
  }

  try {
    const existing = await prisma.notificationDevice.findUnique({
      where: { fcmToken: oldToken },
    });

    if (!existing) {
      // If old token not found, register new token
      const created = await prisma.notificationDevice.create({
        data: {
          fcmToken: newToken,
          lastActive: new Date(),
        },
      });
      return res
        .status(201)
        .json({
          status: "success",
          success: true,
          message: "New token registered.",
          data: created,
        });
    }

    const updated = await prisma.notificationDevice.update({
      where: { fcmToken: oldToken },
      data: {
        fcmToken: newToken,
        lastActive: new Date(),
      },
    });

    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "Token updated successfully.",
        data: updated,
      });
  } catch (error: any) {
    console.error("Failed to update token:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to update token.",
        error: "Failed to update token.",
        details: error.message,
      });
  }
};

// 3. Subscribe to Topic
export const subscribeToTopic = async (req: Request, res: Response) => {
  const { fcmToken, topic } = req.body;

  if (!fcmToken || !topic) {
    return res
      .status(400)
      .json({
        status: "error",
        success: false,
        message: "fcmToken and topic are required.",
        error: "fcmToken and topic are required.",
      });
  }

  const messaging = getMessaging();
  if (!messaging) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: "FCM push notifications not configured on server.",
        error: "FCM push notifications not configured on server.",
      });
  }

  try {
    const response = await messaging.subscribeToTopic([fcmToken], topic);
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "success",
        data: response,
      });
  } catch (error: any) {
    console.error(`Failed to subscribe to topic ${topic}:`, error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to subscribe to topic.",
        error: "Failed to subscribe to topic.",
        details: error.message,
      });
  }
};

// 4. Unsubscribe from Topic
export const unsubscribeFromTopic = async (req: Request, res: Response) => {
  const { fcmToken, topic } = req.body;

  if (!fcmToken || !topic) {
    return res
      .status(400)
      .json({
        status: "error",
        success: false,
        message: "fcmToken and topic are required.",
        error: "fcmToken and topic are required.",
      });
  }

  const messaging = getMessaging();
  if (!messaging) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: "FCM push notifications not configured on server.",
        error: "FCM push notifications not configured on server.",
      });
  }

  try {
    const response = await messaging.unsubscribeFromTopic([fcmToken], topic);
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "success",
        data: response,
      });
  } catch (error: any) {
    console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to unsubscribe from topic.",
        error: "Failed to unsubscribe from topic.",
        details: error.message,
      });
  }
};

// 5. Get User/Guest Inbox Notifications
export const getNotifications = async (req: Request, res: Response) => {
  const { userId, guestId } = req.query;

  try {
    let whereClause: any = {};
    if (userId) {
      whereClause.userId = String(userId);
    } else if (guestId) {
      whereClause.guestId = String(guestId);
      whereClause.userId = null; // Ensure we only get guest specific ones if not logged in
    } else {
      return res
        .status(400)
        .json({
          status: "error",
          success: false,
          message: "Either userId or guestId is required.",
          error: "Either userId or guestId is required.",
        });
    }

    const list = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "success",
        data: list,
      });
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to fetch notifications.",
        error: "Failed to fetch notifications.",
        details: error.message,
      });
  }
};

// 6. Mark Read
export const markRead = async (req: Request, res: Response) => {
  const { ids, id } = req.body;

  try {
    if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { isRead: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id: String(id) },
        data: { isRead: true },
      });
    } else {
      return res
        .status(400)
        .json({
          status: "error",
          success: false,
          message: "id or ids array is required.",
          error: "id or ids array is required.",
        });
    }

    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "Notifications marked as read.",
        data: null,
      });
  } catch (error: any) {
    console.error("Failed to mark notifications as read:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to mark read.",
        error: "Failed to mark read.",
        details: error.message,
      });
  }
};

// 7. Delete Notification
export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.notification.delete({
      where: { id },
    });
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "Notification deleted successfully.",
        data: null,
      });
  } catch (error: any) {
    console.error("Failed to delete notification:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to delete notification.",
        error: "Failed to delete notification.",
        details: error.message,
      });
  }
};

// --- ADMIN CONTROLLERS ---

export const sendPushNotificationInternal = async (params: {
  targetType: string;
  targetValue?: string;
  title: string;
  body: string;
  image?: string;
  actionUrl?: string;
  type?: string;
}) => {
  const { targetType, targetValue, title, body, image, actionUrl, type } =
    params;

  const messaging = getMessaging();
  if (!messaging) {
    throw new Error("FCM push notifications not configured on server.");
  }

  let tokens: string[] = [];
  let isTopic = false;
  let topicName = "";

  // Determine target devices
  if (targetType === "all") {
    const devices = await prisma.notificationDevice.findMany({
      where: { notificationEnabled: true },
      select: { fcmToken: true },
    });
    tokens = devices.map((d) => d.fcmToken);
  } else if (targetType === "guests") {
    const devices = await prisma.notificationDevice.findMany({
      where: { userId: null, notificationEnabled: true },
      select: { fcmToken: true },
    });
    tokens = devices.map((d) => d.fcmToken);
  } else if (targetType === "users") {
    const devices = await prisma.notificationDevice.findMany({
      where: { NOT: { userId: null }, notificationEnabled: true },
      select: { fcmToken: true },
    });
    tokens = devices.map((d) => d.fcmToken);
  } else if (targetType === "device") {
    if (!targetValue)
      throw new Error("targetValue required for device target.");
    tokens = [targetValue];
  } else if (targetType === "topic") {
    if (!targetValue) throw new Error("targetValue required for topic target.");
    isTopic = true;
    topicName = targetValue;
  } else {
    throw new Error("Invalid targetType.");
  }

  let responsePayload: any = null;
  let finalStatus = "SUCCESS";

  const notificationPayload: any = {
    title,
    body,
  };
  if (image) {
    notificationPayload.imageUrl = image;
  }

  const dataPayload = {
    type: type || "SystemAlert",
    click_action: actionUrl || "/",
    title,
    body,
    image: image || "",
  };

  if (isTopic) {
    // Send to Topic
    const message = {
      topic: topicName,
      notification: notificationPayload,
      data: dataPayload,
    };
    responsePayload = await messaging.send(message);

    // Create inbox records for all registered users (simulate inbox list)
    const activeUsers = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: activeUsers.map((u) => ({
        userId: u.id,
        title,
        body,
        image,
        actionUrl,
      })),
    });
  } else {
    if (tokens.length === 0) {
      return null;
    }

    // Send multicast
    const message = {
      tokens,
      notification: notificationPayload,
      data: dataPayload,
    };
    const multicastResponse = await messaging.sendEachForMulticast(message);
    responsePayload = multicastResponse;

    if (multicastResponse.failureCount > 0) {
      finalStatus =
        multicastResponse.failureCount === tokens.length ? "FAILED" : "PARTIAL";

      // Clean up invalid tokens returned in failure responses
      multicastResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === "messaging/invalid-registration-token" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            prisma.notificationDevice
              .delete({ where: { fcmToken: tokens[idx] } })
              .catch(() => {});
          }
        }
      });
    }

    // Add to notifications table for matching users
    const devices = await prisma.notificationDevice.findMany({
      where: { fcmToken: { in: tokens } },
      select: { userId: true, guestId: true },
    });

    const uniqueRecipientUsers = Array.from(
      new Set(devices.map((d) => d.userId).filter((id) => id !== null)),
    ) as string[];
    const guestIds = Array.from(
      new Set(
        devices
          .filter((d) => d.userId === null && d.guestId !== null)
          .map((d) => d.guestId),
      ),
    ) as string[];

    const inboxData: any[] = [];
    uniqueRecipientUsers.forEach((uid) => {
      inboxData.push({
        userId: uid,
        guestId: null,
        title,
        body,
        image,
        actionUrl,
      });
    });
    guestIds.forEach((gid) => {
      inboxData.push({
        userId: null,
        guestId: gid,
        title,
        body,
        image,
        actionUrl,
      });
    });

    if (inboxData.length > 0) {
      await prisma.notification.createMany({ data: inboxData });
    }
  }

  // Log the event
  await prisma.notificationLog.create({
    data: {
      title,
      body,
      type: type || "Manual",
      image,
      actionUrl,
      sentTo: isTopic ? `Topic: ${topicName}` : `${tokens.length} Devices`,
      topic: isTopic ? topicName : null,
      status: finalStatus,
      deliveryStatus: JSON.stringify(responsePayload),
      clickStatus: "PENDING",
      payload: JSON.stringify(dataPayload),
      response: JSON.stringify(responsePayload),
    },
  });

  return responsePayload;
};

// A. Send FCM Notification (Topic, Multi-device or Specific Segment)
export const adminSendNotification = async (req: Request, res: Response) => {
  const {
    targetType, // "all" | "guests" | "users" | "device" | "topic"
    targetValue, // fcmToken or topic name or specific userId
    title,
    body,
    image,
    actionUrl,
    type, // "New Product" | "Offer Campaign" | etc.
  } = req.body;

  if (!title || !body) {
    return res
      .status(400)
      .json({
        status: "error",
        success: false,
        message: "Title and body are required.",
        error: "Title and body are required.",
      });
  }

  try {
    const responsePayload = await sendPushNotificationInternal({
      targetType,
      targetValue,
      title,
      body,
      image,
      actionUrl,
      type,
    });
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "Notification sent successfully.",
        data: responsePayload,
      });
  } catch (error: any) {
    console.error("Failed to send notification:", error);
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message || "Failed to send notification.",
        error: "Failed to send notification.",
        details: error.message,
      });
  }
};

// B. Send to specific topic
export const adminSendTopic = async (req: Request, res: Response) => {
  const { topic, title, body, image, actionUrl } = req.body;
  req.body.targetType = "topic";
  req.body.targetValue = topic;
  req.body.type = "Topic Campaign";
  return adminSendNotification(req, res);
};

// C. Send to specific user
export const adminSendUser = async (req: Request, res: Response) => {
  const { userId, title, body, image, actionUrl } = req.body;

  try {
    const devices = await prisma.notificationDevice.findMany({
      where: { userId, notificationEnabled: true },
      select: { fcmToken: true },
    });

    if (devices.length === 0) {
      // Just save in their inbox since no devices are registered
      await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          image,
          actionUrl,
        },
      });
      return res
        .status(200)
        .json({
          status: "success",
          success: true,
          message: "User has no active devices. Saved to inbox.",
          data: null,
        });
    }

    req.body.targetType = "device";
    req.body.targetValue = devices[0].fcmToken; // Send to first device
    req.body.type = "User Notification";
    return adminSendNotification(req, res);
  } catch (error: any) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message,
        error: error.message,
      });
  }
};

// D. Get Logs
export const adminGetLogs = async (req: Request, res: Response) => {
  try {
    const list = await prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "success",
        data: list,
      });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message,
        error: error.message,
      });
  }
};

// E. Get Analytics
export const adminGetAnalytics = async (req: Request, res: Response) => {
  try {
    const totalDevices = await prisma.notificationDevice.count();
    const activeDevices = await prisma.notificationDevice.count({
      where: {
        lastActive: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const registeredUsers = await prisma.notificationDevice.count({
      where: { NOT: { userId: null } },
    });
    const guestDevices = totalDevices - registeredUsers;

    const totalLogs = await prisma.notificationLog.findMany({
      select: { status: true, response: true },
    });

    let sent = totalLogs.length;
    let delivered = 0;
    let failed = 0;

    totalLogs.forEach((log) => {
      if (log.status === "SUCCESS") delivered++;
      else if (log.status === "PARTIAL")
        delivered++; // counts partially delivered too
      else failed++;
    });

    // Device distribution by OS/browser
    const devices = await prisma.notificationDevice.findMany({
      select: { os: true, browser: true },
    });

    const osDist: Record<string, number> = {};
    const browserDist: Record<string, number> = {};

    devices.forEach((d) => {
      const os = d.os || "Unknown";
      const browser = d.browser || "Unknown";
      osDist[os] = (osDist[os] || 0) + 1;
      browserDist[browser] = (browserDist[browser] || 0) + 1;
    });

    return res.status(200).json({
      status: "success",
      success: true,
      message: "success",
      data: {
        totalDevices,
        activeDevices,
        registeredUsers,
        guestDevices,
        notificationsSent: sent,
        delivered,
        failed,
        openRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        osDistribution: osDist,
        browserDistribution: browserDist,
      },
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message,
        error: error.message,
      });
  }
};

// F. Get Registered Devices list
export const adminGetDevices = async (req: Request, res: Response) => {
  try {
    const list = await prisma.notificationDevice.findMany({
      orderBy: { lastActive: "desc" },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    return res
      .status(200)
      .json({
        status: "success",
        success: true,
        message: "success",
        data: list,
      });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        status: "error",
        success: false,
        message: error.message,
        error: error.message,
      });
  }
};
