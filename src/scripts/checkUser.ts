import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { User, Business } from "../models";

dotenv.config();

async function check() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/mukhalis"
  );

  const phone = "+966549595659";

  // Find the user by phone
  const user = await User.findOne({ phone }).lean();
  console.log("\n=== USER ===");
  if (user) {
    console.log("ID:", user._id);
    console.log("Phone:", user.phone);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log(
      "Individual Profile:",
      JSON.stringify(user.individualProfile, null, 2)
    );
  } else {
    console.log("User not found with phone:", phone);
  }

  // Find business by delegate phone
  const businessByDelegate = await Business.findOne({
    "delegate.phone": phone,
  }).lean();
  console.log("\n=== BUSINESS BY DELEGATE PHONE ===");
  if (businessByDelegate) {
    console.log("Name:", businessByDelegate.name);
    console.log("Owner ID:", businessByDelegate.ownerId);
    console.log(
      "Delegate:",
      JSON.stringify(businessByDelegate.delegate, null, 2)
    );
  } else {
    console.log("No business found with delegate phone:", phone);
  }

  // Find business by ownerId
  if (user?._id) {
    const businessByOwner = await Business.findOne({
      ownerId: user._id,
    }).lean();
    console.log("\n=== BUSINESS BY OWNER ID ===");
    if (businessByOwner) {
      console.log("Name:", businessByOwner.name);
      console.log("Owner ID:", businessByOwner.ownerId);
    } else {
      console.log(
        "No business found where this user is the owner"
      );
    }
  }

  // Check if the ownerId matches the user
  if (businessByDelegate) {
    const owner = await User.findById(businessByDelegate.ownerId).lean();
    console.log("\n=== ACTUAL OWNER OF BUSINESS ===");
    if (owner) {
      console.log("ID:", owner._id);
      console.log("Phone:", owner.phone);
      console.log("Email:", owner.email);
      console.log("Role:", owner.role);
    } else {
      console.log("Owner not found!");
    }
  }

  // Summary
  console.log("\n=== DIAGNOSIS ===");
  if (user && businessByDelegate) {
    const userIdStr = user._id.toString();
    const ownerIdStr = businessByDelegate.ownerId.toString();

    if (userIdStr === ownerIdStr) {
      console.log("✅ User IS the owner of the business");
      if (user.role !== "company") {
        console.log(
          `❌ BUT user role is "${user.role}" instead of "company"!`
        );
        console.log("   This is the bug we fixed.");
      }
    } else {
      console.log("❌ User is NOT the owner of the business");
      console.log("   User ID:", userIdStr);
      console.log("   Owner ID:", ownerIdStr);
      console.log("   Delegate phone matches but different owners!");
    }
  }

  await mongoose.connection.close();
}

check().catch(console.error);

