import { Router } from "express";
import {
  registerAdminDevice,
  updateAdminDevice,
  getAdminDevices,
  getActiveAdminDevices,
  getDeviceDetails,
  toggleNotificationStatus,
  forceRefreshToken,
  exportAdminDevicesCsv,
  deleteAdminDevice,
  removeAdminDevice,
  sendTestNotification,
  broadcastAdminNotification,
  sendAdminMulticastNotification,
  getAdminNotificationLogs,
  cleanupStaleAdminDevices,
} from "../controllers/adminFcm";

const router = Router();

router.post("/register", registerAdminDevice);
router.put("/update", updateAdminDevice);
router.get("/devices", getAdminDevices);
router.get("/active", getActiveAdminDevices);
router.get("/device-details/:id", getDeviceDetails);
router.put("/toggle-notifications", toggleNotificationStatus);
router.post("/refresh-token", forceRefreshToken);
router.get("/export-csv", exportAdminDevicesCsv);
router.get("/delivery-history", getAdminNotificationLogs);
router.post("/cleanup", cleanupStaleAdminDevices);
router.get("/", getAdminDevices);
router.delete("/remove", removeAdminDevice);
router.delete("/:id", deleteAdminDevice);
router.post("/test", sendTestNotification);
router.post("/send", sendAdminMulticastNotification);
router.post("/broadcast", broadcastAdminNotification);
router.get("/logs", getAdminNotificationLogs);


export default router;
