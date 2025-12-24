import { Request, Response } from "express";
import { User, Business } from "../models";
import {
  createOTPSession,
  verifyOTP,
  resendOTP,
} from "../services/otp.service";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { AuthRequest, UserRole } from "../types";
import logger from "../utils/logger";

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    const fullPhone = `${countryCode || "+966"}${phone}`;
    const { sessionId, otp } = await createOTPSession(fullPhone);

    logger.info(`OTP sent to ${fullPhone}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      sessionId,
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  } catch (error) {
    logger.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

export const verifyOTPController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone, otp, sessionId, countryCode } = req.body;

    if (!phone || !otp || !sessionId) {
      res.status(400).json({
        success: false,
        message: "Phone, OTP, and sessionId are required",
      });
      return;
    }

    const fullPhone = `${countryCode || "+966"}${phone}`;
    const isValid = await verifyOTP(fullPhone, otp, sessionId);

    if (!isValid) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
      return;
    }

    let user = await User.findOne({ phone: fullPhone });

    if (!user) {
      user = await User.create({
        phone: fullPhone,
        role: UserRole.INDIVIDUAL,
        isVerified: true,
        isActive: true,
      });
    }

    let isProfileComplete = false;
    let verificationStatus = null;
    let hasBusiness = false;
    let businessData = null;

    if (user.role === UserRole.INDIVIDUAL) {
      isProfileComplete = !!user.individualProfile?.fullName;
    } else {
      // Check if user has a Business entity
      const business = await Business.findOne({ ownerId: user._id });
      hasBusiness = !!business;
      isProfileComplete = hasBusiness;
      verificationStatus = business?.verificationStatus || null;

      // Include basic business data for company users
      if (business) {
        businessData = {
          id: business._id,
          nameAr: business.name,
          nameEn: business.nameEn,
          logoUrl: business.avatarUrl,
          city: business.city,
          verificationStatus: business.verificationStatus,
        };
      }
    }

    logger.info(
      `User ${user.phone} login: role=${user.role}, isProfileComplete=${isProfileComplete}, hasBusiness=${hasBusiness}, verificationStatus=${verificationStatus}`
    );

    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      permissions: [],
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isProfileComplete,
        verificationStatus,
        hasBusiness,
        individualProfile: user.individualProfile,
        business: businessData,
      },
      tokens,
    });
  } catch (error) {
    logger.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

export const resendOTPController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone, sessionId, countryCode } = req.body;

    if (!phone || !sessionId) {
      res.status(400).json({
        success: false,
        message: "Phone and sessionId are required",
      });
      return;
    }

    const fullPhone = `${countryCode || "+966"}${phone}`;
    const success = await resendOTP(fullPhone, sessionId);

    if (!success) {
      res.status(400).json({
        success: false,
        message: "Failed to resend OTP. Session may have expired.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      retryAfter: 60,
    });
  } catch (error) {
    logger.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    const tokens = generateTokens({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      permissions: [],
    });

    res.status(200).json({
      success: true,
      tokens,
    });
  } catch (error) {
    logger.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};
