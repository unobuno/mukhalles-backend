import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../types";
import { verifyAccessToken } from "../utils/jwt";
import { User } from "../models";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select("isActive").lean();

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account has been deleted",
        code: "USER_DELETED",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account has been suspended",
        code: "USER_SUSPENDED",
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    next();
  };
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  _: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select("isActive").lean();

    if (user && user.isActive) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Treat as unauthenticated if token is invalid
    next();
  }
};
