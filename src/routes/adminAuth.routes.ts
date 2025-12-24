import { Router, type Router as IRouter } from "express";
import {
  adminLogin,
  validateAdminToken,
  adminLogout,
  updateAdminProfile,
  changeAdminPassword,
  forgotAdminPassword,
} from "../controllers/adminAuth.controller";
import { authenticate } from "../middleware/auth.middleware";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

// Rate limiting for admin login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message:
      "محاولات تسجيل دخول كثيرة جدًا، يرجى المحاولة مرة أخرى بعد 15 دقيقة",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login - no authentication required
router.post("/login", loginLimiter, adminLogin);

// Validate admin token - requires authentication
router.get("/validate", authenticate, validateAdminToken);

// Admin logout - requires authentication
router.post("/logout", authenticate, adminLogout);

// Update admin profile - requires authentication
router.put("/profile", authenticate, updateAdminProfile);

// Change admin password - requires authentication
router.put("/password", authenticate, changeAdminPassword);

// Forgot password - no authentication required (with rate limiting)
router.post("/forgot-password", loginLimiter, forgotAdminPassword);

export default router;
