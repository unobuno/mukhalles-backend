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

// Saudi phone regex: 5xxxxxxxx (9 digits starting with 5)
const SAUDI_PHONE_REGEX = /^5\d{8}$/;

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

    // Validate Saudi phone format
    const cleanPhone = phone.replace(/\D/g, "");
    if (!SAUDI_PHONE_REGEX.test(cleanPhone)) {
      res.status(400).json({
        success: false,
        message: "Invalid phone number format. Must be a valid Saudi number (5xxxxxxxx)",
      });
      return;
    }

    const fullPhone = `${countryCode || "+966"}${cleanPhone}`;
    const { sessionId, otp } = await createOTPSession(fullPhone);

    logger.info(`OTP sent to ${fullPhone}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      sessionId,
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  } catch (error: any) {
    logger.error("Send OTP error:", error);

    // Handle specific error cases
    const errorMessage = error.message || "";
    let userMessage = "Failed to send OTP. Please try again.";
    let statusCode = 500;

    if (errorMessage.includes("Invalid phone") || errorMessage.includes("not a valid phone")) {
      userMessage = "Invalid phone number";
      statusCode = 400;
    } else if (errorMessage.includes("rate limit") || errorMessage.includes("Max send attempts")) {
      userMessage = "Too many attempts. Please try again later.";
      statusCode = 429;
    } else if (errorMessage.includes("not configured")) {
      userMessage = "SMS service temporarily unavailable";
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      message: userMessage,
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

    // Clean phone to match sendOTP format
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = `${countryCode || "+966"}${cleanPhone}`;
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

    // Check if this is a completely NEW user who hasn't selected account type yet
    // A user is "new" if they have no profile data at all (neither individual nor company)
    const hasIndividualProfile = !!user.individualProfile?.fullName;
    const business = await Business.findOne({ ownerId: user._id });
    const needsAccountTypeSelection =
      !hasIndividualProfile && !business && user.role === UserRole.INDIVIDUAL;

    if (user.role === UserRole.INDIVIDUAL) {
      isProfileComplete = hasIndividualProfile;
    } else {
      // Company user - use the business we already fetched above
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
      `User ${user.phone} login: role=${user.role}, isProfileComplete=${isProfileComplete}, hasBusiness=${hasBusiness}, verificationStatus=${verificationStatus}, needsAccountTypeSelection=${needsAccountTypeSelection}`
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
        needsAccountTypeSelection,
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

    // Clean phone to match sendOTP format
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = `${countryCode || "+966"}${cleanPhone}`;
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
