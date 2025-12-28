import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { User } from "../models";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

/**
 * Get User IDs Script
 *
 * Lists all users with their IDs, names, and push token status
 * Helps find user IDs for testing notifications
 *
 * Usage: npx ts-node src/scripts/getUserIds.ts
 */

async function main() {
  try {
    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    logger.info("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB\n");

    logger.info("=".repeat(80));
    logger.info("📋 USER LIST");
    logger.info("=".repeat(80) + "\n");

    // Get all users
    const users = await User.find({ isActive: true })
      .select(
        "_id role individualProfile pushToken notificationPreferences createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(50);

    if (users.length === 0) {
      logger.info("❌ No users found in the database.\n");
      logger.info(
        "💡 Tip: Make sure users have logged into the app at least once.\n"
      );
      return;
    }

    logger.info(`Found ${users.length} user(s):\n`);

    users.forEach((user, index) => {
      const hasPushToken = user.pushToken ? "✅ Yes" : "❌ No";
      const pushEnabled =
        user.notificationPreferences?.enablePush !== false ? "✅ Yes" : "❌ No";

      let name = "Unknown";
      if (user.role === "individual" && user.individualProfile?.fullName) {
        name = user.individualProfile.fullName;
      } else if (user.role === "company") {
        name = "Company User";
      } else {
        name = user.role || "User";
      }

      logger.info(`${index + 1}. ${name}`);
      logger.info(`   User ID: ${user._id}`);
      logger.info(`   Role: ${user.role}`);
      logger.info(`   Has Push Token: ${hasPushToken}`);
      logger.info(`   Push Enabled: ${pushEnabled}`);
      logger.info(
        `   Offices Pref: ${
          user.notificationPreferences?.offices || "followed"
        }`
      );

      if (user.pushToken) {
        logger.info(`   Push Token: ${user.pushToken.substring(0, 40)}...`);
      }

      logger.info("");
    });

    logger.info("=".repeat(80));
    logger.info("💡 USAGE TIPS");
    logger.info("=".repeat(80) + "\n");

    // Find users with push tokens
    const usersWithPushTokens = users.filter((u) => u.pushToken);

    if (usersWithPushTokens.length > 0) {
      const exampleUser = usersWithPushTokens[0];
      logger.info("✅ Users with push tokens found! You can test with:");
      logger.info("");
      logger.info("Quick test:");
      logger.info(
        `   npx ts-node src/scripts/sendTestNotification.ts ${exampleUser._id}`
      );
      logger.info("");
      logger.info("Full test suite:");
      logger.info(
        `   npx ts-node src/scripts/testNotifications.ts ${exampleUser._id}`
      );
      logger.info("");
    } else {
      logger.info("❌ No users have push tokens yet.");
      logger.info("");
      logger.info("To get a push token:");
      logger.info("1. Login to the app on your mobile device");
      logger.info("2. Allow notifications when prompted");
      logger.info(
        "3. The app will automatically send the push token to the server"
      );
      logger.info("4. Run this script again to see the updated user list");
      logger.info("");
    }

    logger.info("=".repeat(80) + "\n");

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
