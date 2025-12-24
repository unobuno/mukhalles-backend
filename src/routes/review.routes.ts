import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getBusinessReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
} from "../controllers/review.controller";

const router: IRouter = Router();

router.get("/", authenticate, getUserReviews);
router.get("/business/:id", getBusinessReviews);
router.post("/business/:id", authenticate, createReview);
router.put("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);
router.post("/:id/like", authenticate, likeReview);

export default router;
