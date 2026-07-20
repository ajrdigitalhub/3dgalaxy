import { Router } from "express";
import {
  registerAdminDevice,
  getAdminDevices,
  removeAdminDevice,
  sendTestNotification,
  sendAdminMulticastNotification,
  getAdminNotificationLogs,
} from "../controllers/adminFcm";

const router = Router();

router.post("/register", registerAdminDevice);
router.get("/devices", getAdminDevices);
router.delete("/remove", removeAdminDevice);
router.post("/test", sendTestNotification);
router.post("/send", sendAdminMulticastNotification);
router.get("/logs", getAdminNotificationLogs);

export default router;
