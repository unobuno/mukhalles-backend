import crypto from "crypto";
import { OTPSession } from "../models";
import logger from "../utils/logger";

// For development/testing - in production use Twilio
const sendSMS = async (phone: string, message: string): Promise<boolean> => {
  try {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.TWILIO_ACCOUNT_SID
    ) {
      // Twilio integration for production
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phone
      // });
      logger.info(`SMS sent to ${phone} via Twilio`);
    } else {
      // Development mode - just log the OTP
      logger.info(`[DEV MODE] SMS to ${phone}: ${message}`);
    }
    return true;
  } catch (error) {
    logger.error("Failed to send SMS:", error);
    return false;
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const createOTPSession = async (
  phone: string
): Promise<{ sessionId: string; otp: string }> => {
  const otp = generateOTP();
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing sessions for this phone
  await OTPSession.deleteMany({ phone });

  // Create new session
  await OTPSession.create({
    phone,
    otp,
    sessionId,
    expiresAt,
  });

  // Send OTP via SMS
  const message = `Your Mukhalis verification code is: ${otp}. Valid for 10 minutes.`;
  await sendSMS(phone, message);

  return { sessionId, otp: process.env.NODE_ENV === "development" ? otp : "" };
};

export const verifyOTP = async (
  phone: string,
  otp: string,
  sessionId: string
): Promise<boolean> => {
  // Bypass OTP for testing/app store reviews (controlled via env)
  const bypassEnabled = process.env.OTP_BYPASS_ENABLED === "true";
  const bypassCode = process.env.OTP_BYPASS_CODE || "000000";

  if (bypassEnabled && otp === bypassCode) {
    logger.info(`OTP bypass used for ${phone}`);
    // Clean up any existing session
    await OTPSession.deleteMany({ phone, sessionId });
    return true;
  }

  const session = await OTPSession.findOne({
    phone,
    sessionId,
    verified: false,
  });

  if (!session) {
    return false;
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await OTPSession.deleteOne({ _id: session._id });
    return false;
  }

  // Check max attempts
  if (session.attempts >= 5) {
    await OTPSession.deleteOne({ _id: session._id });
    return false;
  }

  // Increment attempts
  session.attempts += 1;

  // Verify OTP
  if (session.otp !== otp) {
    await session.save();
    return false;
  }

  // Mark as verified and delete session
  session.verified = true;
  await session.save();
  await OTPSession.deleteOne({ _id: session._id });

  return true;
};

export const resendOTP = async (
  phone: string,
  sessionId: string
): Promise<boolean> => {
  const session = await OTPSession.findOne({ phone, sessionId });

  if (!session) {
    return false;
  }

  // Generate new OTP but keep the same session
  const newOTP = generateOTP();
  session.otp = newOTP;
  session.attempts = 0;
  session.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await session.save();

  // Send new OTP
  const message = `Your Mukhalis verification code is: ${newOTP}. Valid for 10 minutes.`;
  await sendSMS(phone, message);

  return true;
};
