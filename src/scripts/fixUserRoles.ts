/**
 * Fix User Roles Script
 *
 * This script finds users who have a Business but their role is still "individual"
 * and updates their role to "company".
 *
 * Usage:
 *   npx ts-node src/scripts/fixUserRoles.ts
 *   npx ts-node src/scripts/fixUserRoles.ts --dry-run  (preview only, no changes)
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { User, Business } from "../models";
import { UserRole } from "../types";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  try {
    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    logger.info("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB\n");

    logger.info("=".repeat(60));
    logger.info("🔍 FINDING USERS WITH INCORRECT ROLES");
    logger.info("=".repeat(60));

    if (isDryRun) {
      logger.info("⚠️  DRY RUN MODE - No changes will be made\n");
    }

    // Find all businesses with their owners
    const businesses = await Business.find({}).populate("ownerId").lean();

    logger.info(`📊 Found ${businesses.length} businesses in total\n`);

    let fixedCount = 0;
    const affectedUsers: any[] = [];

    for (const business of businesses) {
      const owner = business.ownerId as any;

      if (!owner) {
        logger.warn(
          `⚠️  Business "${business.name}" (${business._id}) has no owner!`
        );
        continue;
      }

      // Check if owner has wrong role
      if (owner.role === UserRole.INDIVIDUAL) {
        affectedUsers.push({
          userId: owner._id,
          phone: owner.phone,
          email: owner.email || owner.individualProfile?.email,
          currentRole: owner.role,
          businessName: business.name,
          businessId: business._id,
        });

        if (!isDryRun) {
          // Fix the role
          await User.findByIdAndUpdate(owner._id, {
            role: UserRole.COMPANY,
          });
          fixedCount++;
        }
      }
    }

    logger.info("\n" + "=".repeat(60));
    logger.info("📋 AFFECTED USERS");
    logger.info("=".repeat(60));

    if (affectedUsers.length === 0) {
      logger.info("✅ No users found with incorrect roles!");
    } else {
      logger.info(
        `\n❌ Found ${affectedUsers.length} user(s) with wrong role:\n`
      );

      for (const user of affectedUsers) {
        logger.info(`  👤 User: ${user.phone}`);
        logger.info(`     Email: ${user.email || "N/A"}`);
        logger.info(`     Current Role: ${user.currentRole}`);
        logger.info(`     Business: ${user.businessName}`);
        logger.info(`     User ID: ${user.userId}`);
        logger.info(`     Business ID: ${user.businessId}`);
        logger.info("");
      }

      if (isDryRun) {
        logger.info("\n⚠️  DRY RUN - Run without --dry-run to fix these users");
      } else {
        logger.info(
          `\n✅ Fixed ${fixedCount} user(s) - Role updated to "company"`
        );
      }
    }

    logger.info("\n" + "=".repeat(60));
    logger.info("📈 SUMMARY");
    logger.info("=".repeat(60));
    logger.info(`Total businesses: ${businesses.length}`);
    logger.info(`Users with wrong role: ${affectedUsers.length}`);
    if (!isDryRun) {
      logger.info(`Users fixed: ${fixedCount}`);
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
