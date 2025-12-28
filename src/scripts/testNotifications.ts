import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { User } from "../models";
import * as notificationService from "../services/notificationService";
import { NotificationType } from "../types";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

/**
 * Test Notification System
 *
 * This script tests the complete notification flow including:
 * - User preferences respect
 * - Push notification delivery
 * - Different notification types
 * - Database storage
 *
 * Usage:
 * 1. Make sure a user exists with a valid push token
 * 2. Run: npx ts-node src/scripts/testNotifications.ts <userId>
 * 3. Check your mobile device for push notifications
 */

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function addResult(test: string, passed: boolean, message: string) {
  results.push({ test, passed, message });
  const icon = passed ? "✅" : "❌";
  logger.info(`${icon} ${test}: ${message}`);
}

async function testNotificationPreferences(userId: string) {
  logger.info("\n🧪 Testing notification preferences...\n");

  const user = await User.findById(userId);
  if (!user) {
    await addResult("User Check", false, `User ${userId} not found`);
    return;
  }

  await addResult(
    "User Check",
    true,
    `Found user: ${user.individualProfile?.fullName || user.role}`
  );

  // Display current preferences
  logger.info("\n📋 Current Notification Preferences:");
  logger.info(
    `   Push Enabled: ${user.notificationPreferences?.enablePush ?? true}`
  );
  logger.info(
    `   Email Enabled: ${user.notificationPreferences?.enableEmail ?? false}`
  );
  logger.info(
    `   WhatsApp Enabled: ${
      user.notificationPreferences?.enableWhatsApp ?? false
    }`
  );
  logger.info(
    `   SMS Enabled: ${user.notificationPreferences?.enableSMS ?? false}`
  );
  logger.info(
    `   Offices: ${user.notificationPreferences?.offices ?? "followed"}`
  );
  logger.info(`   Push Token: ${user.pushToken ? "✅ Set" : "❌ Not set"}\n`);

  if (!user.pushToken) {
    await addResult(
      "Push Token Check",
      false,
      "User doesn't have a push token. Please login on mobile device first."
    );
    return;
  }

  await addResult(
    "Push Token Check",
    true,
    `Push token exists: ${user.pushToken.substring(0, 30)}...`
  );
}

async function testOfficeNotification(userId: string) {
  logger.info("\n🧪 Test 1: Office Update Notification...\n");

  const payload = {
    type: NotificationType.OFFICE_UPDATE,
    title: {
      ar: "تحديث مكتب جديد",
      en: "New Office Update",
    },
    message: {
      ar: "تم تحديث معلومات أحد المكاتب التي تتابعها",
      en: "An office you follow has updated their information",
    },
    data: {
      officeId: "test-office-id",
      action: "view_office",
    },
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "Office Notification",
    success,
    success
      ? "Office notification sent successfully"
      : "Failed to send office notification (check preferences)"
  );
}

async function testSystemNotification(userId: string) {
  logger.info("\n🧪 Test 2: System Notification...\n");

  const payload = {
    type: NotificationType.SYSTEM,
    title: {
      ar: "إشعار نظام",
      en: "System Notification",
    },
    message: {
      ar: "هذا اختبار لإشعارات النظام",
      en: "This is a test system notification",
    },
    data: {
      testMode: true,
    },
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "System Notification",
    success,
    success
      ? "System notification sent successfully"
      : "Failed to send system notification"
  );
}

async function testAnnouncementNotification(userId: string) {
  logger.info("\n🧪 Test 3: Announcement Notification...\n");

  const payload = {
    type: NotificationType.ANNOUNCEMENT,
    title: {
      ar: "إعلان مهم",
      en: "Important Announcement",
    },
    message: {
      ar: "لدينا ميزات جديدة رائعة في التطبيق!",
      en: "We have exciting new features in the app!",
    },
    data: {
      url: "/announcements",
    },
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "Announcement Notification",
    success,
    success ? "Announcement sent successfully" : "Failed to send announcement"
  );
}

async function testServiceUpdateNotification(userId: string) {
  logger.info("\n🧪 Test 4: Service Update Notification...\n");

  const payload = {
    type: NotificationType.SERVICE_UPDATE,
    title: {
      ar: "تحديث خدمة",
      en: "Service Update",
    },
    message: {
      ar: "تمت إضافة خدمة جديدة إلى مكتب تتابعه",
      en: "A new service has been added to an office you follow",
    },
    data: {
      serviceId: "test-service-id",
      officeName: "مكتب الاختبار",
    },
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "Service Update Notification",
    success,
    success
      ? "Service update sent successfully"
      : "Failed to send service update"
  );
}

async function testWithPushDisabled(userId: string) {
  logger.info("\n🧪 Test 5: Testing with Push Disabled...\n");

  const user = await User.findById(userId);
  if (!user) return;

  // Save original preference
  const originalPushEnabled = user.notificationPreferences?.enablePush;

  // Disable push
  if (!user.notificationPreferences) {
    user.notificationPreferences = {
      offices: "followed",
      enablePush: false,
      enableEmail: false,
      enableWhatsApp: false,
      enableSMS: false,
    };
  } else {
    user.notificationPreferences.enablePush = false;
  }
  await user.save();

  const payload = {
    type: NotificationType.INFO,
    title: {
      ar: "اختبار - يجب أن يتم حظره",
      en: "Test - Should be blocked",
    },
    message: {
      ar: "لا يجب أن تصل هذه الرسالة",
      en: "This message should not arrive",
    },
    data: {},
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "Push Disabled Test",
    !success,
    !success
      ? "✅ Correctly blocked notification when push disabled"
      : "❌ Should have blocked notification"
  );

  // Restore original preference
  user.notificationPreferences.enablePush = originalPushEnabled ?? true;
  await user.save();
  logger.info("   Restored original push preference\n");
}

async function testWithOfficesNone(userId: string) {
  logger.info("\n🧪 Test 6: Testing with Offices = None...\n");

  const user = await User.findById(userId);
  if (!user) return;

  // Save original preference
  const originalOffices = user.notificationPreferences?.offices;

  // Set offices to none
  if (!user.notificationPreferences) {
    user.notificationPreferences = {
      offices: "none",
      enablePush: true,
      enableEmail: false,
      enableWhatsApp: false,
      enableSMS: false,
    };
  } else {
    user.notificationPreferences.offices = "none";
  }
  await user.save();

  const payload = {
    type: NotificationType.OFFICE_UPDATE,
    title: {
      ar: "تحديث مكتب - يجب حظره",
      en: "Office Update - Should be blocked",
    },
    message: {
      ar: "لا يجب أن تصل هذه الرسالة",
      en: "This message should not arrive",
    },
    data: {},
  };

  const success = await notificationService.sendToUser(userId, payload);

  await addResult(
    "Offices None Test",
    !success,
    !success
      ? "✅ Correctly blocked office notification when offices=none"
      : "❌ Should have blocked office notification"
  );

  // Restore original preference
  user.notificationPreferences.offices = originalOffices || "followed";
  await user.save();
  logger.info("   Restored original offices preference\n");
}

async function printSummary() {
  logger.info("\n" + "=".repeat(60));
  logger.info("📊 TEST SUMMARY");
  logger.info("=".repeat(60) + "\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? "✅" : "❌";
    logger.info(`${icon} ${result.test}`);
    if (!result.passed) {
      logger.info(`   └─ ${result.message}`);
    }
  });

  logger.info(`\n📈 Results: ${passed}/${results.length} tests passed`);

  if (failed > 0) {
    logger.info(`\n⚠️  ${failed} test(s) failed. Please check the logs above.`);
  } else {
    logger.info(
      "\n🎉 All tests passed! Notification system is working correctly."
    );
  }

  logger.info("\n" + "=".repeat(60) + "\n");
}

async function main() {
  try {
    const userId = process.argv[2];

    if (!userId) {
      logger.error("❌ Error: Please provide a user ID");
      logger.info(
        "\nUsage: npx ts-node src/scripts/testNotifications.ts <userId>"
      );
      logger.info("\nTo get a user ID:");
      logger.info("1. Login to the app on your mobile device");
      logger.info("2. Check the server logs or database for your user ID");
      logger.info("3. Or use MongoDB Compass to find a user\n");
      process.exit(1);
    }

    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    logger.info("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB\n");

    logger.info("=".repeat(60));
    logger.info("🚀 NOTIFICATION SYSTEM TEST");
    logger.info("=".repeat(60));
    logger.info(`\n📱 Testing for user: ${userId}\n`);

    // Run tests
    await testNotificationPreferences(userId);
    await testOfficeNotification(userId);
    await testSystemNotification(userId);
    await testAnnouncementNotification(userId);
    await testServiceUpdateNotification(userId);
    await testWithPushDisabled(userId);
    await testWithOfficesNone(userId);

    // Print summary
    await printSummary();

    // Close connection
    await mongoose.connection.close();
    logger.info("✅ Database connection closed");
  } catch (error) {
    logger.error("❌ Test failed with error:", error);
    process.exit(1);
  }
}

// Run the script
main();
