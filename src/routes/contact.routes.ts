import { Router, type Router as IRouter } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types";
import { contactLimiter } from "../middleware/rateLimiter";
import {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  addNote,
  deleteInquiry,
} from "../controllers/contact.controller";

const router: IRouter = Router();

// Public route - create inquiry (rate limited to prevent spam)
router.post("/", contactLimiter, createInquiry);

// Admin routes - require admin or moderator role
router.get(
  "/admin/inquiries",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getInquiries,
);
router.get(
  "/admin/inquiries/:id",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getInquiryById,
);
router.patch(
  "/admin/inquiries/:id/status",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  updateInquiryStatus,
);
router.post(
  "/admin/inquiries/:id/notes",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  addNote,
);
router.delete(
  "/admin/inquiries/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteInquiry,
);

export default router;
