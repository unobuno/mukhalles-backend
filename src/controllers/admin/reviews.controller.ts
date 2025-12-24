/**
 * Admin Reviews Controller
 * Handles review moderation and bulk operations
 */
import { Request, Response } from "express";
import { Review, AdminLog } from "../../models";
import { AuthRequest, AdminActionType } from "../../types";
import logger from "../../utils/logger";

export const getReviewsForModeration = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isApproved } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (isApproved !== undefined) query.isApproved = isApproved === "true";

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("userId", "individualProfile.fullName phone")
        .populate("businessId", "name city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get reviews for moderation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reviews",
    });
  }
};

export const approveReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.isApproved = isApproved;
    review.moderatedBy = req.user?.userId as any;
    review.moderatedAt = new Date();
    await review.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.MODERATE_REVIEW,
      target: {
        type: "review",
        id: review._id,
      },
      details: {
        newValues: { isApproved },
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Review moderation status updated successfully",
    });
  } catch (error) {
    logger.error("Approve review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve review",
    });
  }
};

export const deleteReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await Review.findByIdAndDelete(id);

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.MODERATE_REVIEW,
      target: {
        type: "review",
        id: review._id,
      },
      details: {
        reason: "Review deleted by admin",
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
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

export const bulkDeleteReviews = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يرجى تحديد التقييمات",
      });
    }

    const result = await Review.deleteMany({ _id: { $in: ids } });

    logger.info("Bulk delete reviews:", {
      adminId: req.user?.userId,
      deletedCount: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      message: `تم حذف ${result.deletedCount} تقييم`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    logger.error("Bulk delete reviews error:", error);
    res.status(500).json({
      success: false,
      message: "فشل حذف التقييمات",
    });
  }
};

export const deleteAllReviews = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const count = await Review.countDocuments();

    if (count === 0) {
      return res.status(400).json({
        success: false,
        message: "لا توجد تقييمات للحذف",
      });
    }

    await Review.deleteMany({});

    logger.info("All reviews deleted by admin:", {
      adminId: req.user?.userId,
      deletedCount: count,
    });

    res.status(200).json({
      success: true,
      message: `تم حذف جميع التقييمات (${count} تقييم)`,
      data: { deletedCount: count },
    });
  } catch (error) {
    logger.error("Delete all reviews error:", error);
    res.status(500).json({
      success: false,
      message: "فشل حذف التقييمات",
    });
  }
};
