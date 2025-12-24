import { Router, type Router as IRouter } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types";
import {
  createNotification,
  getNotificationStats,
  getNotifications,
  deleteNotification,
  markNotificationAsRead,
  getUsersForTargeting,
  bulkDeleteNotifications,
  bulkMarkAsRead,
  deleteAllNotifications,
} from "../controllers/adminNotifications.controller";

const router: IRouter = Router();

// All notification routes require authentication
router.use(authenticate);

// Notification Management Routes (Admin only)
router.post("/", authorize(UserRole.ADMIN), createNotification);
router.get("/stats", authorize(UserRole.ADMIN), getNotificationStats);
router.get("/users", authorize(UserRole.ADMIN), getUsersForTargeting);
router.get("/", authorize(UserRole.ADMIN), getNotifications);
router.delete("/:id", authorize(UserRole.ADMIN), deleteNotification);
router.put("/:id/read", authorize(UserRole.ADMIN), markNotificationAsRead);

// Bulk actions
router.post("/bulk-delete", authorize(UserRole.ADMIN), bulkDeleteNotifications);
router.post("/bulk-read", authorize(UserRole.ADMIN), bulkMarkAsRead);
router.delete("/", authorize(UserRole.ADMIN), deleteAllNotifications);

export default router;
