import { Request, Response } from "express";
import { AuthRequest, NotificationType } from "../types";
import { User, Notification } from "../models";
import logger from "../utils/logger";
import * as notificationService from "../services/notificationService";

// Create notification for specific user or broadcast to all/roles
export const createNotification = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const {
      title,
      message,
      type,
      targetUsers, // "all", "individuals", "role"
      userIds = [],
      roles = [],
      data,
    } = req.body;

    // Validate required fields (only Arabic is required now)
    if (!title?.ar || !message?.ar) {
      return res.status(400).json({
        success: false,
        message: "العنوان والرسالة بالعربية مطلوبان",
      });
    }

    if (!type || !Object.values(NotificationType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid notification type is required",
      });
    }

    // Prepare title and message with fallback for English
    const notificationTitle = {
      ar: title.ar,
      en: title.en || title.ar,
    };
    const notificationMessage = {
      ar: message.ar,
      en: message.en || message.ar,
    };

    let targetCount = 0;
    let targetDescription = "";

    const notificationPayload = {
      type,
      title: notificationTitle,
      message: notificationMessage,
      data,
    };

    if (targetUsers === "all") {
      // BROADCAST to ALL users (with push notifications)
      const success = await notificationService.sendToAll(notificationPayload);

      // Get count for response message
      targetCount = await User.countDocuments({ isActive: true });
      targetDescription = "جميع المستخدمين";

      logger.info("Broadcast notification sent to all users:", {
        adminId: req.user?.userId,
        type,
        success,
        targetCount,
      });
    } else if (targetUsers === "role" && roles.length > 0) {
      // BROADCAST to specific ROLES (with push notifications)
      const success = await notificationService.sendToRole(
        roles,
        notificationPayload
      );

      // Get count for response message
      targetCount = await User.countDocuments({
        isActive: true,
        role: { $in: roles },
      });
      targetDescription = `الأدوار: ${roles.join("، ")}`;

      logger.info("Broadcast notification sent to roles:", {
        adminId: req.user?.userId,
        type,
        roles,
        success,
        targetCount,
      });
    } else if (targetUsers === "individuals" && userIds.length > 0) {
      // INDIVIDUAL: Send to each user (with push notifications)
      let successCount = 0;

      for (const userId of userIds) {
        const success = await notificationService.sendToUser(
          userId,
          notificationPayload
        );
        if (success) successCount++;
      }

      targetCount = userIds.length;
      targetDescription = `${targetCount} مستخدم محدد (${successCount} نجح)`;

      logger.info("Individual notifications sent:", {
        adminId: req.user?.userId,
        type,
        total: targetCount,
        successful: successCount,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "يرجى تحديد المستهدفين بشكل صحيح",
      });
    }

    res.status(201).json({
      success: true,
      message: `تم إرسال الإشعار بنجاح`,
      data: {
        count: targetCount,
        targetDescription,
        type,
        targetUsers,
      },
    });
  } catch (error) {
    logger.error("Create notification error:", error);
    res.status(500).json({
      success: false,
      message: "فشل إنشاء الإشعار",
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (
  _req: AuthRequest,
  res: Response
) => {
  try {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      recentNotifications,
    ] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      Notification.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "individualProfile.fullName phone role")
        .lean(),
    ]);

    // Get user counts by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          total: totalNotifications,
          unread: unreadNotifications,
          read: totalNotifications - unreadNotifications,
          byType: notificationsByType,
        },
        userCounts,
        recentNotifications,
      },
    });
  } catch (error) {
    logger.error("Get notification stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notification statistics",
    });
  }
};

// Get notifications list (for management)
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, isRead, userId, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === "true";
    if (userId) query.userId = userId;

    if (search) {
      query.$or = [
        { "title.ar": { $regex: search, $options: "i" } },
        { "title.en": { $regex: search, $options: "i" } },
        { "message.ar": { $regex: search, $options: "i" } },
        { "message.en": { $regex: search, $options: "i" } },
      ];
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("userId", "individualProfile.fullName phone role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
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

// Delete notification
export const deleteNotification = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await Notification.findByIdAndDelete(id);

    logger.info("Notification deleted by admin:", {
      adminId: req.user?.userId,
      notificationId: id,
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    logger.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    logger.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// Get users list for targeting
export const getUsersForTargeting = async (req: Request, res: Response) => {
  try {
    const { role, search } = req.query;

    const query: any = { isActive: true };

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { "individualProfile.fullName": { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("_id individualProfile.fullName phone email role isActive")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Get users for targeting error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users for targeting",
    });
  }
};

// Bulk delete notifications
export const bulkDeleteNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يرجى تحديد الإشعارات للحذف",
      });
    }

    const result = await Notification.deleteMany({ _id: { $in: ids } });

    logger.info("Bulk notifications deleted by admin:", {
      adminId: req.user?.userId,
      count: result.deletedCount,
    });

    res.status(200).json({
      success: true,
      message: `تم حذف ${result.deletedCount} إشعار بنجاح`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    logger.error("Bulk delete notifications error:", error);
    res.status(500).json({
      success: false,
      message: "فشل حذف الإشعارات",
    });
  }
};

// Bulk mark notifications as read
export const bulkMarkAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يرجى تحديد الإشعارات",
      });
    }

    const result = await Notification.updateMany(
      { _id: { $in: ids } },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `تم تعيين ${result.modifiedCount} إشعار كمقروء`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    logger.error("Bulk mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "فشل تحديث الإشعارات",
    });
  }
};

// Delete all notifications
export const deleteAllNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const count = await Notification.countDocuments();

    if (count === 0) {
      return res.status(400).json({
        success: false,
        message: "لا توجد إشعارات للحذف",
      });
    }

    await Notification.deleteMany({});

    logger.info("All notifications deleted by admin:", {
      adminId: req.user?.userId,
      deletedCount: count,
    });

    res.status(200).json({
      success: true,
      message: `تم حذف جميع الإشعارات (${count} إشعار)`,
      data: { deletedCount: count },
    });
  } catch (error) {
    logger.error("Delete all notifications error:", error);
    res.status(500).json({
      success: false,
      message: "فشل حذف الإشعارات",
    });
  }
};
