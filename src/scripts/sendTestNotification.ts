import mongoose from "mongoose";
import * as dotenv from "dotenv";
import * as notificationService from "../services/notificationService";
import { NotificationType } from "../types";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

/**
 * Quick Test Script - Send a single notification
 *
 * Usage:
 * npx ts-node src/scripts/sendTestNotification.ts <userId> [type]
 *
 * Examples:
 * npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011
 * npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 system
 * npx ts-node src/scripts/sendTestNotification.ts 507f1f77bcf86cd799439011 office_update
 */

const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  {
    title: { ar: string; en: string };
    message: { ar: string; en: string };
    data: Record<string, any>;
  }
> = {
  [NotificationType.OFFICE_UPDATE]: {
    title: {
      ar: "📍 تحديث مكتب",
      en: "📍 Office Update",
    },
    message: {
      ar: "تم تحديث معلومات مكتب الخليج للخدمات",
      en: "Gulf Services Office has updated their information",
    },
    data: {
      action: "view_office",
      testMode: true,
    },
  },
  [NotificationType.SYSTEM]: {
    title: {
      ar: "⚙️ إشعار النظام",
      en: "⚙️ System Notification",
    },
    message: {
      ar: "هذا إشعار اختبار من نظام مخلص",
      en: "This is a test notification from Mukhalis system",
    },
    data: {
      testMode: true,
    },
  },
  [NotificationType.ANNOUNCEMENT]: {
    title: {
      ar: "📢 إعلان مهم",
      en: "📢 Important Announcement",
    },
    message: {
      ar: "لدينا ميزات جديدة رائعة! تحقق منها الآن",
      en: "We have exciting new features! Check them out now",
    },
    data: {
      url: "/announcements",
      testMode: true,
    },
  },
  [NotificationType.SERVICE_UPDATE]: {
    title: {
      ar: "🔄 تحديث خدمة",
      en: "🔄 Service Update",
    },
    message: {
      ar: "تمت إضافة خدمات جديدة إلى مكتب تتابعه",
      en: "New services have been added to an office you follow",
    },
    data: {
      action: "view_services",
      testMode: true,
    },
  },
  [NotificationType.REVIEW]: {
    title: {
      ar: "⭐ تقييم جديد",
      en: "⭐ New Review",
    },
    message: {
      ar: "تم إضافة تقييم جديد على مكتبك",
      en: "A new review has been added to your office",
    },
    data: {
      action: "view_reviews",
      testMode: true,
    },
  },
  [NotificationType.VERIFICATION_STATUS]: {
    title: {
      ar: "✅ حالة التحقق",
      en: "✅ Verification Status",
    },
    message: {
      ar: "تم تحديث حالة التحقق من حسابك",
      en: "Your account verification status has been updated",
    },
    data: {
      status: "verified",
      testMode: true,
    },
  },
  [NotificationType.MILESTONE]: {
    title: {
      ar: "🎉 إنجاز جديد",
      en: "🎉 New Milestone",
    },
    message: {
      ar: "تهانينا! وصل عدد زوار مكتبك إلى 1000 زائر",
      en: "Congratulations! Your office has reached 1000 visitors",
    },
    data: {
      milestone: "1000_views",
      testMode: true,
    },
  },
  [NotificationType.INFO]: {
    title: {
      ar: "ℹ️ معلومة",
      en: "ℹ️ Information",
    },
    message: {
      ar: "لديك رسالة جديدة في صندوق الوارد",
      en: "You have a new message in your inbox",
    },
    data: {
      testMode: true,
    },
  },
  [NotificationType.BOOKING]: {
    title: {
      ar: "📅 حجز جديد",
      en: "📅 New Booking",
    },
    message: {
      ar: "تم إجراء حجز جديد لخدمتك",
      en: "A new booking has been made for your service",
    },
    data: {
      action: "view_bookings",
      testMode: true,
    },
  },
  [NotificationType.NEW_BUSINESS]: {
    title: {
      ar: "🏢 مكتب جديد",
      en: "🏢 New Business",
    },
    message: {
      ar: "تم تسجيل مكتب جديد في المنصة",
      en: "A new business has been registered on the platform",
    },
    data: {
      action: "view_business",
      testMode: true,
    },
  },
  [NotificationType.NEW_USER]: {
    title: {
      ar: "👤 مستخدم جديد",
      en: "👤 New User",
    },
    message: {
      ar: "تم تسجيل مستخدم فردي جديد في المنصة",
      en: "A new individual user has registered on the platform",
    },
    data: {
      action: "view_user",
      testMode: true,
    },
  },
  [NotificationType.LOW_RATING]: {
    title: {
      ar: "⚠️ تنبيه تقييم",
      en: "⚠️ Rating Alert",
    },
    message: {
      ar: "تحذير: تقييم مكتبك منخفض",
      en: "Warning: Your office rating is low",
    },
    data: {
      action: "view_ratings",
      testMode: true,
    },
  },
  [NotificationType.MAINTENANCE]: {
    title: {
      ar: "🔧 صيانة",
      en: "🔧 Maintenance",
    },
    message: {
      ar: "سيتم إجراء صيانة على النظام قريباً",
      en: "System maintenance will be performed soon",
    },
    data: {
      testMode: true,
    },
  },
};

async function main() {
  try {
    const userId = process.argv[2];
    const notificationType = (process.argv[3] || "system") as NotificationType;

    if (!userId) {
      logger.error("❌ Error: Please provide a user ID");
      logger.info(
        "\nUsage: npx ts-node src/scripts/sendTestNotification.ts <userId> [type]"
      );
      logger.info("\nAvailable types:");
      Object.keys(NOTIFICATION_TEMPLATES).forEach((type) => {
        logger.info(`  - ${type}`);
      });
      logger.info("\nDefault type: system\n");
      process.exit(1);
    }

    if (!NOTIFICATION_TEMPLATES[notificationType]) {
      logger.error(`❌ Error: Invalid notification type: ${notificationType}`);
      logger.info("\nAvailable types:");
      Object.keys(NOTIFICATION_TEMPLATES).forEach((type) => {
        logger.info(`  - ${type}`);
      });
      process.exit(1);
    }

    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    logger.info("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB\n");

    logger.info("=".repeat(60));
    logger.info("📤 SENDING TEST NOTIFICATION");
    logger.info("=".repeat(60));
    logger.info(`\n📱 User ID: ${userId}`);
    logger.info(`📋 Type: ${notificationType}\n`);

    const payload = {
      type: notificationType,
      ...NOTIFICATION_TEMPLATES[notificationType],
    };

    logger.info("📝 Payload:");
    logger.info(`   Arabic Title: ${payload.title.ar}`);
    logger.info(`   Arabic Message: ${payload.message.ar}`);
    logger.info(`   English Title: ${payload.title.en}`);
    logger.info(`   English Message: ${payload.message.en}\n`);

    logger.info("🚀 Sending notification...");
    const success = await notificationService.sendToUser(userId, payload);

    logger.info("\n" + "=".repeat(60));
    if (success) {
      logger.info("✅ SUCCESS: Notification sent successfully!");
      logger.info("📱 Check your mobile device for the push notification");
    } else {
      logger.info("❌ FAILED: Could not send notification");
      logger.info("📋 Possible reasons:");
      logger.info("   1. User not found or inactive");
      logger.info("   2. User has no push token (not logged in on mobile)");
      logger.info("   3. User has disabled push notifications in preferences");
      logger.info(
        "   4. User has set offices preference to 'none' (for office notifications)"
      );
    }
    logger.info("=".repeat(60) + "\n");

    // Close connection
    await mongoose.connection.close();
    logger.info("✅ Database connection closed");
  } catch (error) {
    logger.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
main();
