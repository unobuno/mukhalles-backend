import { Response } from "express";
import { AuthRequest } from "../types";
import { Settings } from "../models";
import logger from "../utils/logger";

// Default settings
const defaultSettings = {
  supportEmail: "support@mukhalis.com",
  supportPhone: "+966500000001",
};

// Get settings (creates default if not exists)
export const getSettings = async (_req: AuthRequest, res: Response) => {
  try {
    let settings = await Settings.findOne({ key: "app_settings" });

    if (!settings) {
      settings = await Settings.create({
        key: "app_settings",
        ...defaultSettings,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      },
    });
  } catch (error) {
    logger.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get settings",
    });
  }
};

// Update settings
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { supportEmail, supportPhone } = req.body;

    const updateData: any = {};
    if (supportEmail) updateData.supportEmail = supportEmail;
    if (supportPhone) updateData.supportPhone = supportPhone;
    if (req.user?.userId) updateData.updatedBy = req.user.userId;

    const settings = await Settings.findOneAndUpdate(
      { key: "app_settings" },
      { $set: updateData },
      { new: true, upsert: true }
    );

    logger.info("Settings updated by admin:", {
      adminId: req.user?.userId,
      updatedFields: Object.keys(updateData),
    });

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      },
    });
  } catch (error) {
    logger.error("Update settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
    });
  }
};

// Reset settings to default
export const resetSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: "app_settings" },
      { $set: { ...defaultSettings, updatedBy: req.user?.userId } },
      { new: true, upsert: true }
    );

    logger.info("Settings reset to default by admin:", {
      adminId: req.user?.userId,
    });

    res.status(200).json({
      success: true,
      message: "Settings reset successfully",
      data: {
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      },
    });
  } catch (error) {
    logger.error("Reset settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset settings",
    });
  }
};
