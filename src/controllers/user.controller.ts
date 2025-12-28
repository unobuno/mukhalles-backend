import { Response } from "express";
import { User } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select("-__v");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        individualProfile: user.individualProfile,
        notificationPreferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fullName, email, city, notificationChannel, address, birthDate } =
      req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Track if this is the first time completing profile
    const isFirstTimeCompletion = !user.individualProfile?.fullName;

    if (!user.individualProfile) {
      user.individualProfile = {
        fullName: "",
        termsAccepted: false,
      };
    }

    if (fullName !== undefined) user.individualProfile.fullName = fullName;
    if (email !== undefined) {
      // Convert empty string to null to avoid duplicate key error with sparse index
      const emailValue = email.trim() === "" ? null : email;
      user.individualProfile.email = emailValue;
      user.email = emailValue;
    }
    if (city !== undefined) user.individualProfile.city = city;
    if (address !== undefined) user.individualProfile.address = address;
    if (birthDate !== undefined) user.individualProfile.birthDate = birthDate;
    if (notificationChannel !== undefined)
      user.individualProfile.notificationChannel = notificationChannel;

    await user.save();

    // Notify admins of new individual user registration (first time only)
    if (isFirstTimeCompletion && fullName && user.role === "individual") {
      try {
        const { Notification } = await import("../models");
        const { NotificationType, UserRole } = await import("../types");

        await Notification.create({
          targetAudience: "roles",
          targetRoles: [UserRole.ADMIN, UserRole.MODERATOR],
          type: NotificationType.NEW_USER,
          title: {
            ar: "مستخدم جديد مسجل",
            en: "New User Registered",
          },
          message: {
            ar: `تم تسجيل مستخدم فردي جديد: "${fullName}"`,
            en: `New individual user registered: "${fullName}"`,
          },
          data: {
            userId: user._id,
            userName: fullName,
            userPhone: user.phone,
            type: "new_registration",
          },
          isRead: false,
        });

        logger.info(
          `Admin notification sent for new individual user: ${fullName}`
        );
      } catch (notifError) {
        logger.error("Failed to create admin notification:", notifError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user.individualProfile,
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const uploadProfilePicture = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    if (!user.individualProfile) {
      user.individualProfile = {
        fullName: "",
        termsAccepted: false,
      };
    }

    user.individualProfile.avatarUrl = avatarUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: { avatarUrl },
    });
  } catch (error) {
    logger.error("Upload profile picture error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile picture",
    });
  }
};

export const getNotificationPreferences = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user.notificationPreferences || {
        offices: "followed",
        enablePush: true,
        enableEmail: false,
        enableWhatsApp: false,
        enableSMS: false,
      },
    });
  } catch (error) {
    logger.error("Get notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get notification preferences",
    });
  }
};

export const updateNotificationPreferences = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { offices, enablePush, enableEmail, enableWhatsApp, enableSMS } =
      req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        offices: "followed",
        enablePush: true,
        enableEmail: false,
        enableWhatsApp: false,
        enableSMS: false,
      };
    }

    if (offices !== undefined) user.notificationPreferences.offices = offices;
    if (enablePush !== undefined)
      user.notificationPreferences.enablePush = enablePush;
    if (enableEmail !== undefined)
      user.notificationPreferences.enableEmail = enableEmail;
    if (enableWhatsApp !== undefined)
      user.notificationPreferences.enableWhatsApp = enableWhatsApp;
    if (enableSMS !== undefined)
      user.notificationPreferences.enableSMS = enableSMS;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: user.notificationPreferences,
    });
  } catch (error) {
    logger.error("Update notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
    });
  }
};

export const updatePushToken = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { pushToken } = req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.pushToken = pushToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Push token updated successfully",
    });
  } catch (error) {
    logger.error("Update push token error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update push token",
    });
  }
};
