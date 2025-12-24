import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedAll } from "../utils/seeder";
import logger from "../utils/logger";

// Load environment variables
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";

const runSeeder = async () => {
  try {
    console.log("🌱 Starting database seeder...\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Run seeder
    console.log("📦 Seeding data...");
    await seedAll();

    console.log("\n✅ Seeding completed successfully!");
    console.log("   - Categories seeded");
    console.log("   - Cities seeded");
    console.log("   - Businesses seeded (with full info)");

    // Disconnect
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error running seeder:", error);
    logger.error("Seeder error:", error);
    process.exit(1);
  }
};

runSeeder();
