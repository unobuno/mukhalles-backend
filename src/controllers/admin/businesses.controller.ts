/**
 * Admin Businesses Controller
 * Handles business management, verification, and featuring
 */
import { Request, Response } from "express";
import { User, Business, AdminLog } from "../../models";
import {
  AuthRequest,
  VerificationStatus,
  AdminActionType,
  UserRole,
} from "../../types";
import logger from "../../utils/logger";
import { sendBusinessStatusNotification } from "../../services/pushNotification.service";

export const getBusinesses = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      verificationStatus,
      featured,
      search,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (featured === "true") query.isFeatured = true;
    if (featured === "false") query.isFeatured = false;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameEn: { $regex: search, $options: "i" } },
        { crNumber: { $regex: search, $options: "i" } },
        { "delegate.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const queryBuilder = Business.find(query)
      .select("-__v")
      .sort({
        order: -1, // Higher order numbers first (matches reorder logic)
        isFeatured: -1, // Featured businesses first
        featuredPriority: -1, // Higher priority featured first
        createdAt: -1, // Newest first
      })
      .skip(limitNum > 0 ? skip : 0);

    if (limitNum > 0) {
      queryBuilder.limit(limitNum);
    }

    const [businesses, total] = await Promise.all([
      queryBuilder.lean(),
      Business.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    logger.error("Get businesses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get businesses",
    });
  }
};

export const createBusiness = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      name,
      nameEn,
      crNumber,
      licenseNumber,
      city,
      category,
      description,
      delegate,
      contact,
    } = req.body;

    if (!name || !city || !category || !delegate) {
      return res.status(400).json({
        success: false,
        message: "الاسم، المدينة، الفئة، وبيانات المفوض مطلوبة",
      });
    }

    if (!delegate.fullName || !delegate.phone || !delegate.email) {
      return res.status(400).json({
        success: false,
        message: "اسم المفوض، هاتفه، وبريده الإلكتروني مطلوبة",
      });
    }

    if (crNumber) {
      const existingBusiness = await Business.findOne({ crNumber });
      if (existingBusiness) {
        return res.status(409).json({
          success: false,
          message: "رقم السجل التجاري مستخدم مسبقاً",
        });
      }
    }

    let ownerUser = await User.findOne({
      $or: [{ phone: delegate.phone }, { email: delegate.email }],
    });

    if (!ownerUser) {
      // Create new user with company role
      ownerUser = await User.create({
        phone: delegate.phone,
        email: delegate.email,
        role: UserRole.COMPANY,
        isActive: true,
        isVerified: true,
        companyProfile: {
          nameAr: name,
          nameEn: nameEn || name,
          crNumber,
          city,
          delegate: {
            fullName: delegate.fullName,
            phone: delegate.phone,
            email: delegate.email,
            position: delegate.position || "مفوض",
          },
        },
      });
    } else {
      // Update existing user's role to COMPANY if they were individual
      if (ownerUser.role !== UserRole.COMPANY) {
        ownerUser.role = UserRole.COMPANY;
        await ownerUser.save();
        logger.info(
          `Updated user ${ownerUser.phone} role from individual to company`
        );
      }
    }

    const newBusiness = await Business.create({
      ownerId: ownerUser._id,
      name,
      nameEn: nameEn || name,
      crNumber,
      licenseNumber: licenseNumber || "",
      city,
      category,
      description: description || "",
      delegate: {
        fullName: delegate.fullName,
        nationalId: delegate.nationalId || "",
        position: delegate.position || "مفوض",
        phone: delegate.phone,
        whatsapp: delegate.whatsapp || delegate.phone,
        email: delegate.email,
      },
      contact: contact || {
        phone: delegate.phone,
        whatsapp: delegate.whatsapp || delegate.phone,
      },
      verificationStatus: "approved" as VerificationStatus,
      isActive: true,
      verified: true,
      isFeatured: false,
      rating: 0,
      ratingCount: 0,
      services: [],
      documents: [],
      stats: {
        profileViews: 0,
        contactClicks: 0,
        bookmarks: 0,
      },
      approvedBy: req.user?.userId,
      approvedAt: new Date(),
    });

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.APPROVE_COMPANY,
      target: {
        type: "business",
        id: newBusiness._id,
        name,
      },
      details: {
        action: "create_business",
        newValues: { name, crNumber, city, category },
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الشركة بنجاح",
      data: {
        _id: newBusiness._id,
        name: newBusiness.name,
        crNumber: newBusiness.crNumber,
        city: newBusiness.city,
        category: newBusiness.category,
        delegate: newBusiness.delegate,
        verificationStatus: newBusiness.verificationStatus,
        createdAt: newBusiness.createdAt,
        ownerId: ownerUser._id,
      },
    });
  } catch (error) {
    logger.error("Create business error:", error);
    return res.status(500).json({
      success: false,
      message: "فشل إنشاء الشركة",
    });
  }
};

export const verifyBusiness = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    business.verificationStatus = status as VerificationStatus;
    business.approvedBy = req.user?.userId as any;
    business.approvedAt = new Date();

    if (status === "approved") {
      // Clear rejection data when approving
      business.reviewIssues = [];
      business.reviewedBy = req.user?.userId as any;
      business.reviewedAt = new Date();
      business.reviewNotes = undefined;
      business.isResubmission = false;
      business.verified = true;
    } else if (status === "rejected") {
      // Save rejection reason
      business.reviewNotes = reason || "";
      business.reviewedBy = req.user?.userId as any;
      business.reviewedAt = new Date();
      business.approvedBy = undefined;
      business.approvedAt = undefined;
      business.isResubmission = false;
      business.verified = false;
    } else if (status === "pending") {
      // Reset to under review
      business.reviewIssues = [];
      business.reviewNotes = undefined;
      business.reviewedBy = undefined;
      business.reviewedAt = undefined;
      business.approvedBy = undefined;
      business.approvedAt = undefined;
      business.isResubmission = false;
      business.verified = false;
    }

    await business.save();

    // Send push notification to business owner
    try {
      const owner = await User.findById(business.ownerId);
      if (owner && owner.pushToken) {
        await sendBusinessStatusNotification(
          owner.pushToken,
          status as "approved" | "rejected",
          business.name,
          reason
        );
      }
    } catch (pushError) {
      logger.error("Failed to send push notification:", pushError);
    }

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.APPROVE_COMPANY,
      target: {
        type: "business",
        id: business._id,
      },
      details: {
        newValues: { verificationStatus: status },
        reason,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Business verification status updated successfully",
    });
  } catch (error) {
    logger.error("Verify business error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify business",
    });
  }
};

export const reviewBusinessProfile = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { reviewIssues, reviewNotes } = req.body;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    business.verificationStatus = VerificationStatus.REJECTED;
    business.reviewIssues = reviewIssues;
    business.reviewNotes = reviewNotes;
    business.reviewedBy = req.user?.userId as any;
    business.reviewedAt = new Date();

    await business.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.REVIEW_COMPANY_PROFILE,
      target: {
        type: "business",
        id: business._id,
      },
      details: {
        reviewIssues,
        reviewNotes,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Business profile reviewed with feedback",
    });
  } catch (error) {
    logger.error("Review business profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to review business profile",
    });
  }
};

export const getPendingReviews = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {
      verificationStatus: "pending",
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameEn: { $regex: search, $options: "i" } },
        { crNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [businesses, total] = await Promise.all([
      Business.find(query)
        .populate("ownerId", "phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Business.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error("Get pending reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending reviews",
    });
  }
};

export const getBusinessForReview = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id)
      .populate("ownerId", "phone email role")
      .lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    logger.error("Get business for review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch business details",
    });
  }
};

export const featureBusiness = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { isFeatured, priority } = req.body;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    business.isFeatured = isFeatured;
    if (priority !== undefined) business.featuredPriority = priority;
    await business.save();

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.FEATURE_OFFICE,
      target: {
        type: "business",
        id: business._id,
      },
      details: {
        newValues: { isFeatured, priority },
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Business featured status updated successfully",
    });
  } catch (error) {
    logger.error("Feature business error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to feature business",
    });
  }
};

export const reorderBusinesses = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: "قائمة المعرفات غير صالحة",
      });
    }

    // Use 1 billion as base to support reordering 1M+ businesses
    const BASE_ORDER = 1_000_000_000;

    const operations = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: BASE_ORDER - index } },
      },
    }));

    if (operations.length > 0) {
      await Business.bulkWrite(operations);
    }

    return res.status(200).json({
      success: true,
      message: "تم تحديث ترتيب الشركات بنجاح",
    });
  } catch (error) {
    console.error("Error reordering businesses:", error);
    return res.status(500).json({
      success: false,
      message: "فشل في تحديث ترتيب الشركات",
    });
  }
};

export const updateBusiness = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.ownerId;
    delete updates.createdAt;
    delete updates.updatedAt;

    const business = await Business.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    await AdminLog.create({
      adminId: req.user?.userId,
      action: AdminActionType.UPDATE_COMPANY,
      target: {
        type: "business",
        id: business._id,
        name: business.name,
      },
      details: {
        action: "update_business_profile",
        updatedFields: Object.keys(updates),
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: business,
    });
  } catch (error) {
    logger.error("Update business error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update business",
    });
  }
};
