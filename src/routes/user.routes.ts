import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  getNotificationPreferences,
  updateNotificationPreferences,
  updatePushToken,
} from "../controllers/user.controller";
import { upload } from "../utils/fileUpload";

const router: IRouter = Router();

router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.post(
  "/profile-picture",
  authenticate,
  upload.single("file"),
  uploadProfilePicture
);
router.get(
  "/notification-preferences",
  authenticate,
  getNotificationPreferences
);
router.put(
  "/notification-preferences",
  authenticate,
  updateNotificationPreferences
);
router.put("/push-token", authenticate, updatePushToken);

export default router;
