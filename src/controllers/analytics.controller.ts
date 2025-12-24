import { Response } from "express";
import { Business, Review, Analytics } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

export const getCompanyAnalytics = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const business = await Business.findOne({
      _id: id,
      ownerId: req.user?.userId,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const reviews = await Review.find({ businessId: id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "individualProfile.fullName")
      .lean();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const viewsByDay = await Analytics.aggregate([
      {
        $match: {
          metric: "business_views",
          "dimensions.businessId": business._id,
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: "$value" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const contactsByDay = await Analytics.aggregate([
      {
        $match: {
          metric: "contact_clicks",
          "dimensions.businessId": business._id,
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          count: { $sum: "$value" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          profileViews: business.stats.profileViews,
          contactClicks: business.stats.contactClicks,
          bookmarks: business.stats.bookmarks,
          reviewsCount: business.ratingCount,
          averageRating: business.rating,
        },
        trends: {
          viewsByDay,
          contactsByDay,
        },
        popularServices: business.services.slice(0, 5),
        recentReviews: reviews,
      },
    });
  } catch (error) {
    logger.error("Get business analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get analytics",
    });
  }
};

export const getPlatformAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = "30d" } = req.query;

    const days =
      period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const metrics = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$metric",
          total: { $sum: "$value" },
        },
      },
    ]);

    const metricsByDay = await Analytics.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            metric: "$metric",
          },
          count: { $sum: "$value" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const topCities = await Analytics.aggregate([
      {
        $match: {
          metric: "business_views",
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$dimensions.city",
          views: { $sum: "$value" },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        metrics,
        metricsByDay,
        topCities,
      },
    });
  } catch (error) {
    logger.error("Get platform analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get platform analytics",
    });
  }
};
