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
    const { fullName, email, city, notificationChannel } = req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!user.individualProfile) {
      user.individualProfile = {
        fullName: "",
        termsAccepted: false,
      };
    }

    if (fullName !== undefined) user.individualProfile.fullName = fullName;
    if (email !== undefined) {
      user.individualProfile.email = email;
      user.email = email;
    }
    if (city !== undefined) user.individualProfile.city = city;
    if (notificationChannel !== undefined)
      user.individualProfile.notificationChannel = notificationChannel;

    await user.save();

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
        offices: "all",
        updates: "important",
        categories: "all",
        enablePush: true,
        enableEmail: true,
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
    const {
      offices,
      updates,
      categories,
      enablePush,
      enableEmail,
      enableWhatsApp,
      enableSMS,
    } = req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        offices: "all",
        updates: "important",
        categories: "all",
        enablePush: true,
        enableEmail: true,
        enableWhatsApp: false,
        enableSMS: false,
      };
    }

    if (offices !== undefined) user.notificationPreferences.offices = offices;
    if (updates !== undefined) user.notificationPreferences.updates = updates;
    if (categories !== undefined)
      user.notificationPreferences.categories = categories;
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
