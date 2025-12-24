import { Router, type Router as IRouter } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types";
import {
  getDashboard,
  getUsers,
  createUser,
  getBusinesses,
  createBusiness,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  verifyBusiness,
  featureBusiness,
  reviewBusinessProfile,
  getPendingReviews,
  getBusinessForReview,
  getReviewsForModeration,
  approveReview,
  deleteReview,
  bulkDeleteReviews,
  deleteAllReviews,
  updateUserRole,
  bulkUpdateRoles,
  getRoleHistory,
  getRoleStatistics,
  reorderBusinesses,
  updateBusiness,
} from "../controllers/admin";

const router: IRouter = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getDashboard
);
router.get("/users", authenticate, authorize(UserRole.ADMIN), getUsers);
router.post("/users", authenticate, authorize(UserRole.ADMIN), createUser);
router.get("/users/:id", authenticate, authorize(UserRole.ADMIN), getUserById);
router.put("/users/:id", authenticate, authorize(UserRole.ADMIN), updateUser);
router.put(
  "/users/:id/status",
  authenticate,
  authorize(UserRole.ADMIN),
  updateUserStatus
);
router.delete(
  "/users/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteUser
);
router.get(
  "/businesses",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getBusinesses
);
router.post(
  "/businesses",
  authenticate,
  authorize(UserRole.ADMIN),
  createBusiness
);
// IMPORTANT: /reorder must come before /:id to avoid being matched as an ID
router.put(
  "/businesses/reorder",
  authenticate,
  authorize(UserRole.ADMIN),
  reorderBusinesses
);
router.put(
  "/businesses/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  updateBusiness
);
router.put(
  "/businesses/:id/verify",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  verifyBusiness
);
router.put(
  "/businesses/:id/featured",
  authenticate,
  authorize(UserRole.ADMIN),
  featureBusiness
);
router.put(
  "/businesses/:id/review",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  reviewBusinessProfile
);
router.get(
  "/businesses/pending-reviews",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getPendingReviews
);
router.get(
  "/businesses/:id/review",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getBusinessForReview
);
router.get(
  "/reviews",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getReviewsForModeration
);
router.put(
  "/reviews/:id/approve",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  approveReview
);
router.delete(
  "/reviews/:id",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteReview
);
router.post(
  "/reviews/bulk-delete",
  authenticate,
  authorize(UserRole.ADMIN),
  bulkDeleteReviews
);
router.delete(
  "/reviews",
  authenticate,
  authorize(UserRole.ADMIN),
  deleteAllReviews
);

// Role Management Routes
router.put(
  "/users/:id/role",
  authenticate,
  authorize(UserRole.ADMIN),
  updateUserRole
);
router.post(
  "/users/bulk-role-update",
  authenticate,
  authorize(UserRole.ADMIN),
  bulkUpdateRoles
);
router.get(
  "/role-history",
  authenticate,
  authorize(UserRole.ADMIN),
  getRoleHistory
);
router.get(
  "/role-statistics",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MODERATOR),
  getRoleStatistics
);

export default router;
