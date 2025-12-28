import { Notification, User, Business } from "../models";
import { NotificationType, UserRole } from "../types";
import logger from "../utils/logger";

/**
 * Enterprise Notification Service
 * Handles preference-aware notification delivery with push notification support
 */

// Expo Push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationPayload {
  type: NotificationType;
  title: { ar: string; en: string };
  message: { ar: string; en: string };
  data?: Record<string, any>;
  priority?: "default" | "normal" | "high";
}

interface SendOptions {
  checkPreferences?: boolean;
  saveToDb?: boolean;
}

/**
 * Send push notification via Expo Push API
 */
async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
    return false;
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
      }),
    });

    const result = (await response.json()) as {
      data?: Array<{ status: string; message?: string }>;
    };

    if (result.data?.[0]?.status === "error") {
      logger.warn(`Push notification failed: ${result.data[0].message}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Expo push error:", error);
    return false;
  }
}

/**
 * Check if user should receive notification based on preferences
 */
function shouldDeliverNotification(
  preferences: any,
  notificationType: NotificationType
): boolean {
  if (!preferences) return true;

  // Check if push is enabled
  if (!preferences.enablePush) return false;

  // Check notification type against preferences
  switch (notificationType) {
    case NotificationType.SERVICE_UPDATE:
    case NotificationType.REVIEW:
    case NotificationType.OFFICE_UPDATE:
    case NotificationType.NEW_BUSINESS:
      // Check offices preference
      if (preferences.offices === "none") return false;
      break;

    case NotificationType.SYSTEM:
    case NotificationType.ANNOUNCEMENT:
    case NotificationType.MAINTENANCE:
    case NotificationType.INFO:
    case NotificationType.VERIFICATION_STATUS:
    case NotificationType.MILESTONE:
    case NotificationType.BOOKING:
    case NotificationType.LOW_RATING:
      // These notifications are always sent if push is enabled
      // (since we removed updates and categories preferences)
      break;
  }

  return true;
}

/**
 * Send notification to a single user
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload,
  options: SendOptions = { checkPreferences: true, saveToDb: true }
): Promise<boolean> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      logger.warn(`User ${userId} not found or inactive`);
      return false;
    }

    // Check preferences if required
    if (options.checkPreferences) {
      if (
        !shouldDeliverNotification(user.notificationPreferences, payload.type)
      ) {
        logger.info(
          `Notification skipped for user ${userId} due to preferences`
        );
        return false;
      }
    }

    // Save to database
    if (options.saveToDb) {
      await Notification.create({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        targetAudience: "individual",
        isRead: false,
      });
    }

    // Send push notification if token exists
    if (user.pushToken && user.notificationPreferences?.enablePush !== false) {
      const lang = "ar"; // Default to Arabic, can be user preference
      await sendExpoPush(
        user.pushToken,
        payload.title[lang],
        payload.message[lang],
        { ...payload.data, notificationType: payload.type }
      );
    }

    return true;
  } catch (error) {
    logger.error(`Send to user ${userId} error:`, error);
    return false;
  }
}

/**
 * Send notification to all users with a specific role
 */
export async function sendToRole(
  role: UserRole | UserRole[],
  payload: NotificationPayload,
  options: SendOptions = { checkPreferences: true, saveToDb: true }
): Promise<{ sent: number; skipped: number }> {
  const roles = Array.isArray(role) ? role : [role];
  let sent = 0;
  let skipped = 0;

  try {
    // Create broadcast notification in DB
    if (options.saveToDb) {
      await Notification.create({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        targetAudience: "roles",
        targetRoles: roles,
        isRead: false,
      });
    }

    // Find all users with the specified roles
    const users = await User.find({
      role: { $in: roles },
      isActive: true,
      pushToken: { $exists: true, $ne: null },
    }).select("_id pushToken notificationPreferences");

    // Send push to each user
    const pushPromises = users.map(async (user) => {
      if (options.checkPreferences) {
        if (
          !shouldDeliverNotification(user.notificationPreferences, payload.type)
        ) {
          skipped++;
          return;
        }
      }

      if (user.pushToken) {
        const success = await sendExpoPush(
          user.pushToken,
          payload.title.ar,
          payload.message.ar,
          { ...payload.data, notificationType: payload.type }
        );
        if (success) sent++;
        else skipped++;
      }
    });

    await Promise.all(pushPromises);

    logger.info(`Role notification: ${sent} sent, ${skipped} skipped`);
    return { sent, skipped };
  } catch (error) {
    logger.error("Send to role error:", error);
    return { sent, skipped };
  }
}

/**
 * Send broadcast notification to all users
 */
export async function sendToAll(
  payload: NotificationPayload,
  options: SendOptions = { checkPreferences: true, saveToDb: true }
): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  try {
    // Create broadcast notification in DB
    if (options.saveToDb) {
      await Notification.create({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        targetAudience: "all",
        isRead: false,
      });
    }

    // Find all active users with push tokens
    const users = await User.find({
      isActive: true,
      pushToken: { $exists: true, $ne: null },
    }).select("_id pushToken notificationPreferences");

    // Send in batches to avoid rate limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      const pushPromises = batch.map(async (user) => {
        if (options.checkPreferences) {
          if (
            !shouldDeliverNotification(
              user.notificationPreferences,
              payload.type
            )
          ) {
            skipped++;
            return;
          }
        }

        if (user.pushToken) {
          const success = await sendExpoPush(
            user.pushToken,
            payload.title.ar,
            payload.message.ar,
            { ...payload.data, notificationType: payload.type }
          );
          if (success) sent++;
          else skipped++;
        }
      });

      await Promise.all(pushPromises);
    }

    logger.info(`Broadcast notification: ${sent} sent, ${skipped} skipped`);
    return { sent, skipped };
  } catch (error) {
    logger.error("Send to all error:", error);
    return { sent, skipped };
  }
}

/**
 * Send notification to business owners
 */
export async function sendToBusinessOwner(
  businessId: string,
  payload: NotificationPayload,
  options: SendOptions = { checkPreferences: true, saveToDb: true }
): Promise<boolean> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      logger.warn(`Business ${businessId} not found`);
      return false;
    }

    // Get owner user ID from ownerId
    const ownerId = business.ownerId?.toString();

    if (!ownerId) {
      logger.warn(`Business ${businessId} has no owner`);
      return false;
    }

    return sendToUser(
      ownerId,
      {
        ...payload,
        data: { ...payload.data, businessId },
      },
      options
    );
  } catch (error) {
    logger.error(`Send to business owner error:`, error);
    return false;
  }
}

/**
 * Send notification about new review
 */
export async function notifyNewReview(
  businessId: string,
  reviewerName: string,
  rating: number
): Promise<boolean> {
  return sendToBusinessOwner(businessId, {
    type: NotificationType.REVIEW,
    title: {
      ar: "تقييم جديد",
      en: "New Review",
    },
    message: {
      ar: `قام ${reviewerName} بتقييم مكتبك بـ ${rating} نجوم`,
      en: `${reviewerName} rated your office ${rating} stars`,
    },
    data: { businessId, rating },
    priority: "high",
  });
}

/**
 * Send welcome notification to new user
 */
export async function notifyWelcome(userId: string): Promise<boolean> {
  return sendToUser(
    userId,
    {
      type: NotificationType.SYSTEM,
      title: {
        ar: "مرحباً بك في مُخلِّص!",
        en: "Welcome to Mukhalis!",
      },
      message: {
        ar: "ابدأ بتصفح المكاتب واكتشف أفضل خدمات التخليص الجمركي",
        en: "Start browsing offices and discover the best customs clearance services",
      },
      priority: "default",
    },
    { checkPreferences: false, saveToDb: true }
  );
}

export default {
  sendToUser,
  sendToRole,
  sendToAll,
  sendToBusinessOwner,
  notifyNewReview,
  notifyWelcome,
  sendExpoPush,
};
