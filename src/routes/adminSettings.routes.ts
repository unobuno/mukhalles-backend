import { Router, type Router as IRouter } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../types";
import {
  getSettings,
  updateSettings,
  resetSettings,
} from "../controllers/adminSettings.controller";

const router: IRouter = Router();

// All settings routes require admin authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// Settings CRUD
router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/reset", resetSettings);

export default router;
