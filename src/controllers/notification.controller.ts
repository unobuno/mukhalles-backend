import { Response } from "express";
import { Notification } from "../models";
import { AuthRequest, NotificationType } from "../types";
import logger from "../utils/logger";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Query for user's personal notifications AND broadcast notifications
    const baseQuery: any = {
      $or: [
        { userId: req.user?.userId, targetAudience: "individual" }, // Personal
        { targetAudience: "all" }, // Broadcast to all
        { targetAudience: "roles", targetRoles: req.user?.role }, // Role-based
      ],
    };

    // Add optional filters
    if (type && type !== "all") baseQuery.type = type;
    if (isRead !== undefined) baseQuery.isRead = isRead === "true";

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(baseQuery),
      Notification.countDocuments({
        ...baseQuery,
        isRead: false,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
    });
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Find notification that user has access to (individual, role-based, or broadcast)
    const notification = await Notification.findOne({
      _id: id,
      $or: [
        { userId, targetAudience: "individual" },
        { targetAudience: "all" },
        { targetAudience: "roles", targetRoles: userRole },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    logger.error("Mark notification as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Mark all accessible notifications as read
    await Notification.updateMany(
      {
        isRead: false,
        $or: [
          { userId, targetAudience: "individual" },
          { targetAudience: "all" },
          { targetAudience: "roles", targetRoles: userRole },
        ],
      },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    logger.error("Mark all notifications as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: { ar: string; en: string },
  message: { ar: string; en: string },
  data?: any
) => {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
    });
  } catch (error) {
    logger.error("Create notification error:", error);
  }
};
