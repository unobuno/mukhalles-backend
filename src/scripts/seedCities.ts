import mongoose from "mongoose";
import { City } from "../models";
import logger from "../utils/logger";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const cities = [
  { id: "riyadh", title: "الرياض" },
  { id: "jeddah", title: "جدة" },
  { id: "dammam", title: "الدمام" },
  { id: "makkah", title: "مكة المكرمة" },
  { id: "madinah", title: "المدينة المنورة" },
  { id: "khobar", title: "الخبر" },
  { id: "taif", title: "الطائف" },
  { id: "tabuk", title: "تبوك" },
  { id: "abha", title: "أبها" },
  { id: "qatif", title: "القطيف" },
  { id: "jubail", title: "الجبيل" },
  { id: "hail", title: "حائل" },
  { id: "khamis-mushait", title: "خميس مشيط" },
  { id: "najran", title: "نجران" },
  { id: "jazan", title: "جازان" },
  { id: "yanbu", title: "ينبع" },
  { id: "al-ahsa", title: "الأحساء" },
  { id: "arar", title: "عرعر" },
  { id: "sakaka", title: "سكاكا" },
  { id: "buraydah", title: "بريدة" },
];

async function seedCities() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    logger.info("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.info("✅ Connected to MongoDB");

    logger.info(
      "\n============================================================"
    );
    logger.info("🌍 SEEDING CITIES");
    logger.info(
      "============================================================\n"
    );

    // Delete all existing cities first
    logger.info("🗑️  Deleting all existing cities...");
    const deleteResult = await City.deleteMany({});
    logger.info(`✅ Deleted ${deleteResult.deletedCount} cities\n`);

    let created = 0;

    for (const cityData of cities) {
      try {
        // Create new city
        await City.create({
          id: cityData.id,
          title: cityData.title,
          isActive: true,
        });
        logger.info(`✅ Created: ${cityData.title} (${cityData.id})`);
        created++;
      } catch (error) {
        logger.error(`❌ Error creating ${cityData.title}:`, error);
      }
    }

    logger.info(
      "\n============================================================"
    );
    logger.info("📊 SUMMARY");
    logger.info("============================================================");
    logger.info(`✅ Created: ${created}`);
    logger.info(`📍 Total: ${cities.length}`);
    logger.info(
      "============================================================\n"
    );

    // Verify cities in database
    const totalCities = await City.countDocuments({ isActive: true });
    logger.info(`✅ Active cities in database: ${totalCities}`);

    logger.info("\n✅ Database connection closed");
    await mongoose.connection.close();
  } catch (error) {
    logger.error("❌ Error seeding cities:", error);
    process.exit(1);
  }
}

// Run the seeder
seedCities();
