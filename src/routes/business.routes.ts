import { Router, type Router as IRouter } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/auth.middleware";
import {
  getBusinesses,
  getFeaturedBusinesses,
  getBusinessById,
  trackBusinessContactClick,
  trackSocialMediaClick,
  updateBusiness,
} from "../controllers/company.controller";
import {
  getBusinessReviews,
  createReview,
} from "../controllers/review.controller";
import {
  addBookmark,
  removeBookmark,
} from "../controllers/bookmark.controller";

const router: IRouter = Router();

router.get("/", optionalAuthenticate, getBusinesses);
router.get("/featured", optionalAuthenticate, getFeaturedBusinesses);
router.get("/:id", optionalAuthenticate, getBusinessById);
router.put("/:id", authenticate, updateBusiness);
router.post("/:id/contact-click", authenticate, trackBusinessContactClick);
router.post("/:id/social-media-click", authenticate, trackSocialMediaClick);
router.get("/:id/reviews", getBusinessReviews);
router.post("/:id/reviews", authenticate, createReview);
router.post("/:id/bookmark", authenticate, addBookmark);
router.delete("/:id/bookmark", authenticate, removeBookmark);

export default router;
