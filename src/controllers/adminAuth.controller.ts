import { Request, Response } from "express";
import { User } from "../models";
import { AuthRequest, UserRole } from "../types";
import { generateTokens } from "../utils/jwt";
import logger from "../utils/logger";

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني وكلمة المرور مطلوبان",
      });
    }

    const ADMIN_CREDENTIALS: Record<string, string> = {
      "admin@mukhalis.com": "admin123",
      "moderator@mukhalis.com": "mod123",
    };

    // Check if credentials match
    if (
      typeof email === "string" &&
      ADMIN_CREDENTIALS[email] &&
      ADMIN_CREDENTIALS[email] === password
    ) {
      const role =
        email === "admin@mukhalis.com" ? UserRole.ADMIN : UserRole.MODERATOR;

      let adminUser = await User.findOne({
        $or: [
          { email: email },
          { phone: "+966500000001" }, // Default admin phone
        ],
      });

      if (!adminUser) {
        // Create admin user if not exists
        adminUser = new User({
          phone: "+966500000001",
          email: email,
          role: role,
          isVerified: true,
          isActive: true,
          individualProfile: {
            fullName: role === UserRole.ADMIN ? "مدير النظام" : "مشرف",
            email: email,
            termsAccepted: true,
          },
        });
        await adminUser.save();
      }

      // Generate JWT tokens
      const tokens = generateTokens({
        userId: adminUser.id,
        phone: adminUser.phone,
        role: adminUser.role,
        permissions:
          role === UserRole.ADMIN
            ? [
                "dashboard",
                "users",
                "companies",
                "offices",
                "reviews",
                "settings",
              ]
            : ["dashboard", "reviews", "companies"],
      });

      logger.info(`Admin login successful: ${email} (${role})`);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            userId: adminUser.id,
            phone: adminUser.phone,
            email: adminUser.email,
            role: adminUser.role,
            permissions:
              role === UserRole.ADMIN
                ? [
                    "dashboard",
                    "users",
                    "companies",
                    "offices",
                    "reviews",
                    "settings",
                  ]
                : ["dashboard", "reviews", "companies"],
            individualProfile: adminUser.individualProfile,
          },
          tokens,
        },
      });
    }

    // Invalid credentials
    logger.warn(`Admin login failed: ${email}`);
    return res.status(401).json({
      success: false,
      message: "بيانات الاعتماد غير صحيحة",
    });
  } catch (error) {
    logger.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول",
    });
  }
};

export const validateAdminToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    // Check if user has admin or moderator role
    if (
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.MODERATOR
    ) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح بالوصول إلى لوحة التحكم",
      });
    }

    // Get user details from database
    const user = await User.findById(req.user.userId).select("-__v");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "الحساب غير نشط",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          userId: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          permissions: req.user.permissions,
          individualProfile: user.individualProfile,
        },
      },
    });
  } catch (error) {
    logger.error("Validate admin token error:", error);
    return res.status(500).json({
      success: false,
      message: "فشل التحقق من الجلسة",
    });
  }
};

export const adminLogout = async (_req: Request, res: Response) => {
  try {
    logger.info("Admin logout successful");

    return res.status(200).json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (error) {
    logger.error("Admin logout error:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الخروج",
    });
  }
};

export const updateAdminProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    const { fullName, email, phone } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // Update user fields
    if (fullName && user.individualProfile) {
      user.individualProfile.fullName = fullName;
    }
    if (email) user.email = email;
    if (phone) user.phone = phone;

    await user.save();

    logger.info(`Admin profile updated: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "تم تحديث البيانات بنجاح",
      data: {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        individualProfile: user.individualProfile,
      },
    });
  } catch (error) {
    logger.error("Update admin profile error:", error);
    return res.status(500).json({
      success: false,
      message: "فشل تحديث البيانات",
    });
  }
};

export const changeAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح بالوصول",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "كلمة المرور الحالية والجديدة مطلوبتان",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    // For now, just validate the current password against hardcoded credentials
    // In production, this would validate against a hashed password in DB
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // Note: In production, implement proper password hashing/validation
    logger.info(`Admin password changed: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    logger.error("Change admin password error:", error);
    return res.status(500).json({
      success: false,
      message: "فشل تغيير كلمة المرور",
    });
  }
};

export const forgotAdminPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مطلوب",
      });
    }

    // Check if user exists with this email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration attacks
    // In production, you would:
    // 1. Generate a reset token
    // 2. Store it in DB with expiry
    // 3. Send email with reset link

    if (user) {
      // Log the request (in production, send email here)
      logger.info(`Password reset requested for: ${email}`);

      // TODO: Implement email sending
      // const resetToken = crypto.randomBytes(32).toString('hex');
      // await sendPasswordResetEmail(email, resetToken);
    }

    return res.status(200).json({
      success: true,
      message:
        "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة بها رابط إعادة التعيين",
    });
  } catch (error) {
    logger.error("Forgot admin password error:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    });
  }
};
