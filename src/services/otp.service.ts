import crypto from "crypto";
import Twilio from "twilio";
import { OTPSession } from "../models";
import logger from "../utils/logger";

// Initialize Twilio client
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Send OTP via Twilio Verify
 * Returns a sessionId for app flow tracking
 */
export const createOTPSession = async (
  phone: string,
): Promise<{ sessionId: string; otp: string }> => {
  const sessionId = generateSessionId();

  // Delete any existing sessions for this phone
  await OTPSession.deleteMany({ phone });

  // Create session for tracking (expiry, rate limiting)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await OTPSession.create({
    phone,
    otp: "twilio-verify", // Placeholder - Twilio handles the actual OTP
    sessionId,
    expiresAt,
  });

  // In production, use Twilio Verify
  if (
    process.env.NODE_ENV === "production" ||
    process.env.USE_TWILIO === "true"
  ) {
    if (!twilioClient || !VERIFY_SERVICE_SID) {
      logger.error("Twilio Verify not configured");
      throw new Error("SMS service not configured");
    }

    try {
      const verification = await twilioClient.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({
          to: phone,
          channel: "sms",
        });

      logger.info(
        `Twilio Verify sent to ${phone}, status: ${verification.status}`,
      );

      return { sessionId, otp: "" };
    } catch (error: any) {
      logger.error("Twilio Verify error:", error);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // Development mode - generate local OTP and log it
  const devOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Update session with dev OTP for local verification
  await OTPSession.updateOne({ sessionId }, { otp: devOtp });

  logger.info(`[DEV MODE] OTP for ${phone}: ${devOtp}`);

  return { sessionId, otp: devOtp };
};

/**
 * Verify OTP using Twilio Verify or local verification
 */
export const verifyOTP = async (
  phone: string,
  otp: string,
  sessionId: string,
): Promise<boolean> => {
  // Bypass OTP for testing/app store reviews
  const bypassEnabled = process.env.OTP_BYPASS_ENABLED === "true";
  const bypassCode = process.env.OTP_BYPASS_CODE || "000000";

  if (bypassEnabled && otp === bypassCode) {
    logger.info(`OTP bypass used for ${phone}`);
    await OTPSession.deleteMany({ phone, sessionId });
    return true;
  }

  // Check if session exists and is valid
  const session = await OTPSession.findOne({
    phone,
    sessionId,
    verified: false,
  });

  if (!session) {
    logger.warn(`No session found for ${phone} with sessionId ${sessionId}`);
    return false;
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await OTPSession.deleteOne({ _id: session._id });
    logger.warn(`Session expired for ${phone}`);
    return false;
  }

  // Check max attempts
  if (session.attempts >= 5) {
    await OTPSession.deleteOne({ _id: session._id });
    logger.warn(`Max attempts reached for ${phone}`);
    return false;
  }

  // Increment attempts
  session.attempts += 1;
  await session.save();

  // In production, use Twilio Verify to check the code
  if (
    process.env.NODE_ENV === "production" ||
    process.env.USE_TWILIO === "true"
  ) {
    if (!twilioClient || !VERIFY_SERVICE_SID) {
      logger.error("Twilio Verify not configured");
      return false;
    }

    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phone,
          code: otp,
        });

      if (verificationCheck.status === "approved") {
        logger.info(`OTP verified for ${phone} via Twilio Verify`);
        await OTPSession.deleteOne({ _id: session._id });
        return true;
      }

      logger.warn(
        `Twilio Verify failed for ${phone}, status: ${verificationCheck.status}`,
      );
      return false;
    } catch (error: any) {
      logger.error("Twilio Verify check error:", error);
      return false;
    }
  }

  // Development mode - verify against stored OTP
  if (session.otp !== otp) {
    logger.warn(`Invalid OTP for ${phone} in dev mode`);
    return false;
  }

  logger.info(`OTP verified for ${phone} in dev mode`);
  await OTPSession.deleteOne({ _id: session._id });
  return true;
};

/**
 * Resend OTP using Twilio Verify
 */
export const resendOTP = async (
  phone: string,
  sessionId: string,
): Promise<boolean> => {
  const session = await OTPSession.findOne({ phone, sessionId });

  if (!session) {
    logger.warn(`No session found for resend: ${phone}`);
    return false;
  }

  // Reset session
  session.attempts = 0;
  session.expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // In production, use Twilio Verify to resend
  if (
    process.env.NODE_ENV === "production" ||
    process.env.USE_TWILIO === "true"
  ) {
    if (!twilioClient || !VERIFY_SERVICE_SID) {
      logger.error("Twilio Verify not configured");
      return false;
    }

    try {
      const verification = await twilioClient.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({
          to: phone,
          channel: "sms",
        });

      logger.info(
        `Twilio Verify resent to ${phone}, status: ${verification.status}`,
      );
      await session.save();
      return true;
    } catch (error: any) {
      logger.error("Twilio Verify resend error:", error);
      return false;
    }
  }

  // Development mode - generate new OTP
  const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
  session.otp = newOTP;
  await session.save();

  logger.info(`[DEV MODE] Resent OTP for ${phone}: ${newOTP}`);
  return true;
};
