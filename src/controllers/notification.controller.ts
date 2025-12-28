import { Response } from "express";
import mongoose from "mongoose";
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

    const [rawNotifications, total] = await Promise.all([
      Notification.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(baseQuery),
    ]);

    // Transform notifications to add per-user read status
    const userId = req.user?.userId;
    const notifications = rawNotifications.map((notification: any) => {
      // For broadcast/role-based, check if user is in readBy array
      // For individual, use isRead field
      const isReadByUser =
        notification.targetAudience === "individual"
          ? notification.isRead
          : (userId &&
              notification.readBy?.some(
                (id: any) => id.toString() === userId.toString()
              )) ||
            false;

      return {
        ...notification,
        isRead: isReadByUser,
      };
    });

    // Count unread notifications for this user
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

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

    // For broadcast/role-based notifications, track per-user read status
    if (
      notification.targetAudience === "all" ||
      notification.targetAudience === "roles"
    ) {
      // Add user to readBy array if not already there
      if (userId) {
        if (!notification.readBy) {
          notification.readBy = [];
        }
        if (
          !notification.readBy.some((id) => id.toString() === userId.toString())
        ) {
          notification.readBy.push(new mongoose.Types.ObjectId(userId));
        }
      }
    } else {
      // For individual notifications, use the isRead field
      notification.isRead = true;
      notification.readAt = new Date();
    }

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

    // Get all accessible notifications
    const notifications = await Notification.find({
      $or: [
        { userId, targetAudience: "individual" },
        { targetAudience: "all" },
        { targetAudience: "roles", targetRoles: userRole },
      ],
    });

    // Update each notification
    const updates = notifications.map(async (notification) => {
      if (notification.targetAudience === "individual") {
        // For individual notifications, mark as read
        notification.isRead = true;
        notification.readAt = new Date();
      } else if (userId) {
        // For broadcast/role-based, add user to readBy array
        if (!notification.readBy) {
          notification.readBy = [];
        }
        if (
          !notification.readBy.some((id) => id.toString() === userId.toString())
        ) {
          notification.readBy.push(new mongoose.Types.ObjectId(userId));
        }
      }
      return notification.save();
    });

    await Promise.all(updates);

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

export const clearAllNotifications = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Delete all personal notifications for this user
    await Notification.deleteMany({
      userId,
      targetAudience: "individual",
    });

    await Notification.updateMany(
      {
        $or: [
          { targetAudience: "all" },
          { targetAudience: "roles", targetRoles: userRole },
        ],
      },
      {
        $pull: { readBy: userId },
      }
    );

    res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    logger.error("Clear all notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear all notifications",
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
