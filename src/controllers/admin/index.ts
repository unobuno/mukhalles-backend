/**
 * Admin Controllers Index
 * Re-exports all admin controller functions for backwards compatibility
 */

// Dashboard
export { getDashboard } from "./dashboard.controller";

// Users
export {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  updateUserRole,
  bulkUpdateRoles,
  getRoleHistory,
  getRoleStatistics,
} from "./users.controller";

// Businesses
export {
  getBusinesses,
  createBusiness,
  verifyBusiness,
  reviewBusinessProfile,
  getPendingReviews,
  getBusinessForReview,
  featureBusiness,
  reorderBusinesses,
  updateBusiness,
} from "./businesses.controller";

// Reviews
export {
  getReviewsForModeration,
  approveReview,
  deleteReview,
  bulkDeleteReviews,
  deleteAllReviews,
} from "./reviews.controller";
