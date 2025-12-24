// Script to drop the stale officeId index from bookmarks collection
// Run this with: node server/drop-bookmark-index.js

const mongoose = require("mongoose");
require("dotenv").config({ path: "./server/.env" });

async function dropStaleIndex() {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("bookmarks");

    // List current indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", JSON.stringify(indexes, null, 2));

    // Drop the stale index if it exists
    try {
      await collection.dropIndex("userId_1_officeId_1");
      console.log("Successfully dropped stale index: userId_1_officeId_1");
    } catch (err) {
      if (err.code === 27) {
        console.log(
          "Index userId_1_officeId_1 does not exist, nothing to drop"
        );
      } else {
        throw err;
      }
    }

    // Verify indexes after drop
    const newIndexes = await collection.indexes();
    console.log("Indexes after cleanup:", JSON.stringify(newIndexes, null, 2));

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

dropStaleIndex();
