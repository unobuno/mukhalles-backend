/**
 * Admin Users Controller
 * Handles user management, roles, and status
 */
import { Request, Response } from "express";
import { User, AdminLog, Business } from "../../models";
import { AuthRequest, AdminActionType, UserRole } from "../../types";
import logger from "../../utils/logger";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (role) query.role = role;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (status === "pending") query.role = "company";
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: "i" } },
        { "individualProfile.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

export const createUser = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { phone, email, role, fullName, sendInvite = true } = req.body;

    if (!phone || !email || !role || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Phone, email, role, and fullName are required",
      });
    }

    if (![UserRole.ADMIN, UserRole.MODERATOR].includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Can only create admin or moderator users. Other users should register through the app.",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ phone }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          existingUser.phone === phone
            ? "رقم الهاتف مستخدم مسبقاً"
            : "البريد الإلكتروني مستخدم مسبقاً",
      });
    }

    const newUser = await User.create({
      phone,
      email,
      role,
      isActive: true,
      isVerified: false,
      individualProfile: {
        fullName,
        email,
      },
    });

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.CHANGE_USER_ROLE,
      target: {
        type: "user",
        id: newUser._id,
        name: fullName,
      },
      details: {
        action: "create_user",
        newValues: { phone, email, role, fullName },
        sendInvite,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (sendInvite) {
      logger.info(
        `Invite email should be sent to ${email} for user ${fullName}`
      );
    }

    return res.status(201).json({
      success: true,
      message: sendInvite
        ? "تم إنشاء المستخدم وإرسال دعوة بالبريد الإلكتروني"
        : "تم إنشاء المستخدم بنجاح",
      data: {
        _id: newUser._id,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        individualProfile: newUser.individualProfile,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    logger.error("Create user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-__v").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Get user by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

export const updateUserStatus = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.SUSPEND_USER,
      target: {
        type: "user",
        id: user._id,
      },
      details: {
        oldValues: { isActive: oldStatus },
        newValues: { isActive },
        reason,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
    });
  } catch (error) {
    logger.error("Update user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { reason, permanent = false } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting yourself
    if (user.id === req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك حذف حسابك الخاص",
      });
    }

    // If user is a company owner, handle their business
    let businessDeleted = false;
    if (user.role === UserRole.COMPANY) {
      const business = await Business.findOne({ ownerId: user._id });
      if (business) {
        if (permanent) {
          await Business.deleteOne({ _id: business._id });
          businessDeleted = true;
        } else {
          // Soft delete - just deactivate the business
          business.isActive = false;
          business.verificationStatus = "rejected" as any;
          await business.save();
        }
      }
    }

    // Create audit log before deletion
    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.SUSPEND_USER,
      target: {
        type: "user",
        id: user._id,
        name: user.individualProfile?.fullName || user.phone,
      },
      details: {
        action: permanent ? "permanent_delete" : "soft_delete",
        reason,
        userData: {
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        businessDeleted,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    if (permanent) {
      // Permanent deletion - remove user from database
      await User.deleteOne({ _id: user._id });

      return res.status(200).json({
        success: true,
        message: "تم حذف المستخدم نهائياً",
        data: { businessDeleted },
      });
    } else {
      // Soft deletion - mark as inactive
      user.isActive = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "تم تعليق حساب المستخدم",
        data: { businessDeactivated: user.role === UserRole.COMPANY },
      });
    }
  } catch (error) {
    logger.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "فشل حذف المستخدم",
    });
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldValues = {
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      email: user.email,
      individualProfile: user.individualProfile
        ? { ...user.individualProfile }
        : undefined,
    };

    const allowedFields = [
      "role",
      "isActive",
      "phone",
      "email",
      "individualProfile.fullName",
      "individualProfile.nationalId",
      "individualProfile.nationality",
      "individualProfile.dateOfBirth",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          if (!(user as any)[parent]) (user as any)[parent] = {};
          (user as any)[parent][child] = updateData[field];
        } else {
          (user as any)[field] = updateData[field];
        }
      }
    });

    await user.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.UPDATE_USER,
      target: {
        type: "user",
        id: user._id,
      },
      details: {
        oldValues,
        newValues: updateData,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    logger.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { role, reason } = req.body;

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
        availableRoles: Object.values(UserRole),
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.id === req.user?.userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot change your own role",
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.CHANGE_USER_ROLE,
      target: {
        type: "user",
        id: user._id,
        name: user.individualProfile?.fullName || user.phone,
      },
      details: {
        oldValues: { role: oldRole },
        newValues: { role },
        reason,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: `User role changed from ${oldRole} to ${role} successfully`,
      data: {
        userId: user._id,
        oldRole,
        newRole: role,
      },
    });
  } catch (error) {
    logger.error("Update user role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

export const bulkUpdateRoles = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { userIds, role, reason } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
    }

    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
        availableRoles: Object.values(UserRole),
      });
    }

    const filteredUserIds = userIds.filter((id) => id !== req.user?.userId);
    if (filteredUserIds.length !== userIds.length) {
      return res.status(403).json({
        success: false,
        message: "Cannot change your own role in bulk update",
      });
    }

    const users = await User.find({ _id: { $in: filteredUserIds } });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid users found",
      });
    }

    const updatePromises = users.map(async (user) => {
      const oldRole = user.role;
      user.role = role;
      await user.save();
      return {
        userId: user._id,
        oldRole,
        newRole: role,
        name: user.individualProfile?.fullName || user.phone,
      };
    });

    const updatedUsers = await Promise.all(updatePromises);

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.BULK_ROLE_UPDATE,
      target: {
        type: "users",
        id: null,
        count: updatedUsers.length,
      },
      details: {
        newValues: { role },
        reason,
        affectedUsers: updatedUsers,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: `Successfully updated role for ${updatedUsers.length} users to ${role}`,
      data: {
        updatedCount: updatedUsers.length,
        updates: updatedUsers,
      },
    });
  } catch (error) {
    logger.error("Bulk update roles error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk update user roles",
    });
  }
};

export const getRoleHistory = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { page = 1, limit = 20, userId, actionType } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    query.action = {
      $in: [AdminActionType.CHANGE_USER_ROLE, AdminActionType.BULK_ROLE_UPDATE],
    };

    if (userId) query["target.id"] = userId;
    if (actionType) query.action = actionType;

    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .populate("adminId", "individualProfile.fullName phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdminLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get role history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get role history",
    });
  }
};

export const getRoleStatistics = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    const formattedStats = roleStats.reduce((acc: any, stat: any) => {
      acc[stat._id] = {
        total: stat.count,
        active: stat.active,
        inactive: stat.count - stat.active,
        percentage: ((stat.count / totalUsers) * 100).toFixed(2),
      };
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        statistics: formattedStats,
        totals: {
          allUsers: totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
        },
        availableRoles: Object.values(UserRole),
      },
    });
  } catch (error) {
    logger.error("Get role statistics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get role statistics",
    });
  }
};
