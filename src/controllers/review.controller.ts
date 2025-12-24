import { Response } from "express";
import mongoose from "mongoose";
import { Review, Business, User, Notification } from "../models";
import { AuthRequest, NotificationType, UserRole } from "../types";
import logger from "../utils/logger";
import { sendPushNotification } from "../services/pushNotification.service";

export const getBusinessReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      rating,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { businessId: id, isApproved: true };
    if (rating) query.rating = parseInt(rating as string);

    const sortOptions: any = {};
    if (sortBy === "created_at")
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "rating") sortOptions.rating = sortOrder === "asc" ? 1 : -1;

    const currentUserId = req.user?.userId;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .select("-likes") // Exclude the full likes array for efficiency
        .populate(
          "userId",
          "individualProfile.fullName individualProfile.avatarUrl"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    // Add isLikedByMe flag if user is authenticated
    let reviewsWithLikeStatus = reviews;
    if (currentUserId) {
      // Get likes for current user for these reviews
      const reviewIds = reviews.map((r: any) => r._id);
      const userLikes = await Review.find(
        { _id: { $in: reviewIds }, "likes.userId": currentUserId },
        { _id: 1 }
      ).lean();
      const likedReviewIds = new Set(
        userLikes.map((r: any) => r._id.toString())
      );

      reviewsWithLikeStatus = reviews.map((review: any) => ({
        ...review,
        isLikedByMe: likedReviewIds.has(review._id.toString()),
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsWithLikeStatus,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get business reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
    });
  }
};

export const createReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rating, text, serviceTag } = req.body;

    if (!rating || !text) {
      return res.status(400).json({
        success: false,
        message: "Rating and text are required",
      });
    }

    const existingReview = await Review.findOne({
      businessId: id,
      userId: req.user?.userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this business",
      });
    }

    const review = await Review.create({
      businessId: id,
      userId: req.user?.userId,
      rating,
      text,
      serviceTag,
      likes: [],
      likesCount: 0,
      isApproved: true,
    });

    const reviews = await Review.find({ businessId: id, isApproved: true });
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Business.findByIdAndUpdate(id, {
      rating: avgRating,
      ratingCount: reviews.length,
    });

    // Get business with owner details for notifications
    try {
      const business = await Business.findById(id);
      if (business?.ownerId) {
        const owner = await User.findById(business.ownerId);

        // Create in-app notification for business owner
        await Notification.create({
          userId: business.ownerId,
          targetAudience: "individual",
          type: NotificationType.REVIEW,
          title: {
            ar: "تقييم جديد ⭐",
            en: "New Review ⭐",
          },
          message: {
            ar: `حصل مكتبك "${business.name}" على تقييم ${rating} نجوم`,
            en: `Your office "${business.name}" received a ${rating} star review`,
          },
          data: {
            businessId: id,
            reviewId: review._id,
            rating,
          },
          isRead: false,
        });

        // Send push notification to owner
        if (owner?.pushToken) {
          await sendPushNotification(
            [owner.pushToken],
            rating >= 4 ? "تقييم جديد ⭐" : "تقييم جديد",
            `حصل مكتبك على تقييم ${rating} نجوم`,
            { type: "new_review", businessId: id, rating }
          );
        }
      }

      // Alert admins for low ratings (1-2 stars) - may need moderation
      if (rating <= 2) {
        await Notification.create({
          targetAudience: "roles",
          targetRoles: [UserRole.ADMIN, UserRole.MODERATOR],
          type: NotificationType.LOW_RATING,
          title: {
            ar: "تقييم سلبي ⚠️",
            en: "Low Rating Alert ⚠️",
          },
          message: {
            ar: `تقييم ${rating} نجوم على مكتب "${
              business?.name || "غير معروف"
            }"`,
            en: `${rating} star review on "${business?.name || "Unknown"}"`,
          },
          data: {
            businessId: id,
            reviewId: review._id,
            rating,
            requiresModeration: true,
          },
          isRead: false,
        });
      }
    } catch (notifError) {
      logger.error("Failed to create review notifications:", notifError);
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    logger.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create review",
    });
  }
};

export const updateReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rating, text, serviceTag } = req.body;

    const review = await Review.findOne({ _id: id, userId: req.user?.userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (rating !== undefined) review.rating = rating;
    if (text !== undefined) review.text = text;
    if (serviceTag !== undefined) review.serviceTag = serviceTag;

    await review.save();

    const reviews = await Review.find({
      businessId: review.businessId,
      isApproved: true,
    });
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Business.findByIdAndUpdate(review.businessId, {
      rating: avgRating,
      ratingCount: reviews.length,
    });

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    logger.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
    });
  }
};

export const deleteReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const review = await Review.findOne({ _id: id, userId: req.user?.userId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const businessId = review.businessId;
    await Review.findByIdAndDelete(id);

    const reviews = await Review.find({ businessId, isApproved: true });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    await Business.findByIdAndUpdate(businessId, {
      rating: avgRating,
      ratingCount: reviews.length,
    });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    logger.error("Delete review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};

export const likeReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const likeIndex = review.likes.findIndex(
      (like) => like.userId.toString() === userId.toString()
    );

    if (likeIndex > -1) {
      review.likes.splice(likeIndex, 1);
      review.likesCount = review.likes.length;
      await review.save();

      return res.status(200).json({
        success: true,
        isLiked: false,
        likesCount: review.likesCount,
      });
    }

    review.likes.push({ userId, createdAt: new Date() });
    review.likesCount = review.likes.length;
    await review.save();

    return res.status(200).json({
      success: true,
      isLiked: true,
      likesCount: review.likesCount,
    });
  } catch (error) {
    logger.error("Like review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to like review",
    });
  }
};

export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await Review.find({ userId: req.user?.userId })
      .populate("businessId", "name city avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    logger.error("Get user reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
    });
  }
};
