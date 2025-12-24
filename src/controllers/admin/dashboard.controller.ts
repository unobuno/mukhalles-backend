/**
 * Admin Dashboard Controller
 * Handles dashboard statistics and analytics
 */
import { Response } from "express";
import { User, Business, Review, AdminLog, Analytics } from "../../models";
import { AuthRequest } from "../../types";
import logger from "../../utils/logger";

export const getDashboard = async (_req: AuthRequest, res: Response) => {
  try {
    // Date boundaries
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const twelveDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalBusinesses,
      pendingVerifications,
      totalReviews,
      activeToday,
    ] = await Promise.all([
      User.countDocuments({ role: "individual" }),
      Business.countDocuments(),
      Business.countDocuments({ verificationStatus: "pending" }),
      Review.countDocuments(),
      Analytics.countDocuments({
        metric: "business_views",
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Aggregate engagement stats from Analytics collection
    const engagementAggregation = await Analytics.aggregate([
      {
        $match: {
          metric: { $in: ["business_views", "contact_clicks", "bookmarks"] },
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$metric",
          total: { $sum: "$value" },
        },
      },
    ]);

    // Also get previous period for growth calculation
    const previousEngagement = await Analytics.aggregate([
      {
        $match: {
          metric: { $in: ["business_views", "contact_clicks", "bookmarks"] },
          timestamp: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$metric",
          total: { $sum: "$value" },
        },
      },
    ]);

    // ALSO sum from Business.stats as primary source (more reliable)
    const businessStatsSum = await Business.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$stats.profileViews" },
          totalClicks: { $sum: "$stats.contactClicks" },
          totalBookmarks: { $sum: "$stats.bookmarks" },
        },
      },
    ]);

    const businessTotals = businessStatsSum[0] || {
      totalViews: 0,
      totalClicks: 0,
      totalBookmarks: 0,
    };

    // Process engagement stats from Analytics (for growth calculation)
    const currentStats: Record<string, number> = {};
    const previousStats: Record<string, number> = {};

    engagementAggregation.forEach((stat) => {
      currentStats[stat._id] = stat.total;
    });
    previousEngagement.forEach((stat) => {
      previousStats[stat._id] = stat.total;
    });

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    // Use Business.stats totals as primary values (always available)
    // Fall back to Analytics if Business.stats is 0
    const engagementStats = {
      profileViews: {
        value: businessTotals.totalViews || currentStats["business_views"] || 0,
        growth: calculateGrowth(
          currentStats["business_views"] || 0,
          previousStats["business_views"] || 0
        ),
      },
      contactClicks: {
        value:
          businessTotals.totalClicks || currentStats["contact_clicks"] || 0,
        growth: calculateGrowth(
          currentStats["contact_clicks"] || 0,
          previousStats["contact_clicks"] || 0
        ),
      },
      bookmarks: {
        value: businessTotals.totalBookmarks || currentStats["bookmarks"] || 0,
        growth: calculateGrowth(
          currentStats["bookmarks"] || 0,
          previousStats["bookmarks"] || 0
        ),
      },
    };

    // User growth chart data (last 12 days)
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          individuals: {
            $sum: {
              $cond: [{ $eq: ["$_id.role", "individual"] }, "$count", 0],
            },
          },
          companies: {
            $sum: { $cond: [{ $eq: ["$_id.role", "company"] }, "$count", 0] },
          },
          total: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with zeros
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = userGrowthData.find((d) => d._id === dateStr);
      chartData.push({
        date: dateStr,
        day: date.getDate(),
        individuals: dayData?.individuals || 0,
        companies: dayData?.companies || 0,
        total: dayData?.total || 0,
      });
    }

    const topBusinesses = await Business.find({
      verificationStatus: "approved",
    })
      .select("name nameEn rating ratingCount avatarUrl city category stats")
      .sort({ "stats.profileViews": -1, "stats.contactClicks": -1 })
      .limit(10)
      .lean();

    const recentActivities = await AdminLog.find()
      .populate("adminId", "phone individualProfile.fullName")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalBusinesses,
          pendingVerifications,
          totalReviews,
          activeToday,
        },
        engagementStats,
        userGrowthChart: chartData,
        recentActivities,
        topBusinesses,
      },
    });
  } catch (error) {
    logger.error("Get dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
    });
  }
};
