import { Response } from "express";
import { User, Business, Analytics, Bookmark, Notification } from "../models";
import {
  AuthRequest,
  NotificationType,
  UploadStatus,
  UserRole,
  VerificationStatus,
} from "../types";
import logger from "../utils/logger";

export const registerCompany = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      nameAr,
      nameEn,
      crNumber,
      vatNumber,
      city,
      nationalAddress,
      website,
      activity,
      licenseNumber,
      delegate,
    } = req.body;

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    const existingBusiness = await Business.findOne({ crNumber });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: "يوجد مكتب مسجل بهذا الرقم التجاري مسبقاً",
      });
    }

    user.role = UserRole.COMPANY;
    await user.save();

    const business = await Business.create({
      ownerId: user._id,
      name: nameAr,
      nameEn: nameEn,
      description: activity,
      crNumber: crNumber,
      vatNumber: vatNumber,
      city: city,
      nationalAddress: nationalAddress,
      website: website,
      licenseNumber: licenseNumber,
      category: "other",
      verificationStatus: VerificationStatus.PENDING,
      isFeatured: false,
      featuredPriority: 0,
      rating: 0,
      ratingCount: 0,
      contact: {
        phone: delegate.phone,
        whatsapp: delegate.whatsapp,
      },
      delegate: delegate,
      services: [],
      documents: [],
      stats: {
        profileViews: 0,
        contactClicks: 0,
        bookmarks: 0,
      },
      isActive: false,
    });

    // Notify admins of new business registration
    try {
      await Notification.create({
        targetAudience: "roles",
        targetRoles: [UserRole.ADMIN, UserRole.MODERATOR],
        type: NotificationType.NEW_BUSINESS,
        title: {
          ar: "مكتب جديد مسجل",
          en: "New Business Registered",
        },
        message: {
          ar: `تم تسجيل مكتب جديد: "${business.name}" - بانتظار المراجعة`,
          en: `New business registered: "${business.name}" - Pending review`,
        },
        data: {
          businessId: business._id,
          businessName: business.name,
          type: "new_registration",
        },
        isRead: false,
      });
    } catch (notifError) {
      logger.error("Failed to create admin notification:", notifError);
    }

    return res.status(201).json({
      success: true,
      message: "تم تسجيل المكتب بنجاح. سنقوم بمراجعة طلبك في أقرب وقت.",
      data: business,
    });
  } catch (error) {
    logger.error("Register company error:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل المكتب. الرجاء المحاولة مرة أخرى.",
    });
  }
};

export const getCompanyProfile = async (
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

    // Find the Business entity for this user
    const business = await Business.findOne({ ownerId: user._id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        basicInfo: {
          name: business.name,
          nameEn: business.nameEn,
          description: business.description,
          crNumber: business.crNumber,
          vatNumber: business.vatNumber,
          city: business.city,
          nationalAddress: business.nationalAddress,
          website: business.website,
          licenseNumber: business.licenseNumber,
          category: business.category,
        },
        contact: business.contact,
        socials: business.socials,
        delegate: business.delegate,
        verificationStatus: business.verificationStatus,
        reviewIssues: business.reviewIssues,
        reviewNotes: business.reviewNotes,
        documents: business.documents,
        rating: business.rating,
        ratingCount: business.ratingCount,
        isFeatured: business.isFeatured,
      },
    });
  } catch (error) {
    logger.error("Get company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get business profile",
    });
  }
};

export const updateCompanyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const updates = req.body;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find the Business entity for this user
    const business = await Business.findOne({ ownerId: user._id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    // Store old values for admin log
    const oldStatus = business.verificationStatus;
    const wasRejected = oldStatus === VerificationStatus.REJECTED;

    const allowedUpdates = [
      "name",
      "nameEn",
      "description",
      "city",
      "nationalAddress",
      "address",
      "mapLink",
      "website",
      "contact",
      "socials",
      "delegate",
      "crNumber",
      "vatNumber",
      "licenseNumber",
      "services",
      "foundationDate",
      "workDays",
      "workTime",
    ];

    // Map frontend field names to backend field names
    const fieldMapping: Record<string, string> = {
      nameAr: "name",
      activity: "description",
    };

    // Apply field mapping
    for (const [frontendField, backendField] of Object.entries(fieldMapping)) {
      if (updates[frontendField] !== undefined) {
        (business as any)[backendField] = updates[frontendField];
      }
    }

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (business as any)[field] = updates[field];
      }
    });

    // Handle document updates
    if (updates.documents && typeof updates.documents === "object") {
      // updates.documents is a map like { cr: "url", powerOfAttorney: "url" }
      for (const [docType, fileUrl] of Object.entries(updates.documents)) {
        if (!fileUrl) continue;

        // Find existing document of this type
        const existingDocIndex = business.documents.findIndex(
          (d) => d.documentType === docType
        );

        const docEntry: any = {
          documentType: docType,
          fileUrl: fileUrl as string,
          fileName: `${docType}.pdf`,
          fileSize: 0,
          mimeType: "application/pdf",
          uploadStatus: UploadStatus.PENDING,
          uploadedBy: user._id,
          uploadedAt: new Date(),
        };

        if (existingDocIndex >= 0) {
          // Update existing document
          business.documents[existingDocIndex] = docEntry;
        } else {
          // Add new document
          business.documents.push(docEntry);
        }
      }
    }

    // If profile was rejected and user resubmits, reset to pending
    if (wasRejected) {
      business.verificationStatus = VerificationStatus.PENDING;
      business.isResubmission = true;
      business.reviewIssues = [];
      business.reviewNotes = undefined;
      business.reviewedBy = undefined;
      business.reviewedAt = undefined;
    }

    await business.save();

    // Create admin notification for resubmission
    if (wasRejected) {
      try {
        await Notification.create({
          targetAudience: "roles",
          targetRoles: [UserRole.ADMIN, UserRole.MODERATOR],
          type: NotificationType.SYSTEM,
          title: {
            ar: "إعادة تقديم طلب شركة",
            en: "Company Resubmission",
          },
          message: {
            ar: `قام "${business.name}" بإعادة تقديم طلب التسجيل بعد تعديل البيانات المرفوضة`,
            en: `"${business.name}" has resubmitted their registration after editing rejected data`,
          },
          data: {
            businessId: business._id,
            businessName: business.name,
            type: "resubmission",
          },
          isRead: false,
        });
      } catch (notifError) {
        logger.error("Failed to create admin notification:", notifError);
      }
    }

    logger.info("Company profile updated:", {
      businessId: business._id,
      userId: user._id,
      wasRejected,
      isResubmission: business.isResubmission,
      newStatus: business.verificationStatus,
      documentsUpdated: updates.documents ? Object.keys(updates.documents) : [],
    });

    return res.status(200).json({
      success: true,
      message: wasRejected
        ? "تم تحديث البيانات وإعادة الإرسال للمراجعة"
        : "Business profile updated successfully",
      data: {
        verificationStatus: business.verificationStatus,
        resubmitted: wasRejected,
      },
    });
  } catch (error) {
    logger.error("Update company profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update business profile",
    });
  }
};

export const uploadCompanyDocument = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find the Business entity for this user
    const business = await Business.findOne({ ownerId: user._id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    business.documents.push({
      documentType,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadStatus: UploadStatus.PENDING,
      uploadedBy: user.id!,
      uploadedAt: new Date(),
    });

    await business.save();

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        fileUrl,
        fileName: req.file.originalname,
      },
    });
  } catch (error) {
    logger.error("Upload company document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
    });
  }
};

export const deleteCompanyDocument = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { documentId } = req.params;
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const business = await Business.findOne({ ownerId: user._id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    business.documents = business.documents.filter(
      (doc) => doc._id && doc._id.toString() !== documentId
    );

    await business.save();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logger.error("Delete company document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
    });
  }
};

export const getBusinessForUser = async (
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

    // Find the Business entity for this user
    const business = await Business.findOne({ ownerId: user._id });

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
    logger.error("Get business for user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get business",
    });
  }
};

// Public business functions (replacing office functionality)
export const getBusinesses = async (req: any, res: any) => {
  try {
    const {
      page = 1,
      limit = 20,
      city,
      category,
      featured,
      search,
      sortBy = "rating",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isActive: true, verificationStatus: "approved" };

    if (city) query.city = city;
    if (category) query.category = category;
    if (featured === "true") query.isFeatured = true;
    if (search) {
      // Use regex for partial matching (better for Arabic with prefixes like ال)
      const searchRegex = new RegExp(search as string, "i");
      query.$or = [
        { name: searchRegex },
        { nameEn: searchRegex },
        { description: searchRegex },
        { city: searchRegex },
      ];
    }

    const sortOptions: any = {};

    if (featured === "true") {
      sortOptions.order = -1;
    } else {
      if (sortBy === "rating")
        sortOptions.rating = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "created_at")
        sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "featured_priority") {
        sortOptions.isFeatured = -1;
        sortOptions.order = -1;
      }
    }

    const [businesses, total] = await Promise.all([
      Business.find(query)
        .select("-services -__v")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Business.countDocuments(query),
    ]);

    // Add bookmark status if user is logged in
    if (req.user?.userId) {
      try {
        const userBookmarks = await Bookmark.find({
          userId: req.user.userId,
        }).select("businessId");

        const bookmarkedIds = new Set(
          userBookmarks.map((b) => b.businessId.toString())
        );

        businesses.forEach((b: any) => {
          b.isBookmarked = bookmarkedIds.has(b._id.toString());
        });
      } catch (err) {
        logger.error("Error fetching bookmarks for businesses:", err);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        businesses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
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

// Optimized endpoint for featured businesses (home screen)
export const getFeaturedBusinesses = async (req: any, res: any) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    const businesses = await Business.find({
      isActive: true,
      verificationStatus: "approved",
      isFeatured: true,
    })
      .select("_id name city rating ratingCount coverUrl avatarUrl order")
      .sort({ order: -1 }) // descending - higher order = appears first (matches admin reorder)
      .limit(limitNum)
      .lean();

    if (req.user?.userId) {
      try {
        const userBookmarks = await Bookmark.find({
          userId: req.user.userId,
        }).select("businessId");

        const bookmarkedIds = new Set(
          userBookmarks.map((b) => b.businessId.toString())
        );

        businesses.forEach((b: any) => {
          b.isBookmarked = bookmarkedIds.has(b._id.toString());
        });
      } catch (err) {
        logger.error("Error fetching bookmarks for featured:", err);
      }
    }

    res.status(200).json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    logger.error("Get featured businesses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get featured businesses",
    });
  }
};

export const getBusinessById = async (req: any, res: any): Promise<any> => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id).lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    // Add bookmark status if user is logged in
    if (req.user?.userId) {
      try {
        const bookmark = await Bookmark.findOne({
          userId: req.user.userId,
          businessId: id,
        });

        (business as any).isBookmarked = !!bookmark;
      } catch (err) {
        logger.error("Error fetching bookmark for business:", err);
      }
    }

    await Business.findByIdAndUpdate(id, { $inc: { "stats.profileViews": 1 } });

    await Analytics.create({
      metric: "business_views",
      value: 1,
      dimensions: {
        businessId: business._id,
        city: business.city,
        category: business.category,
      },
      timestamp: new Date(),
      granularity: "hour",
    });

    return res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    logger.error("Get business by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get business",
    });
  }
};

export const trackBusinessContactClick = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    await Business.findByIdAndUpdate(id, {
      $inc: { "stats.contactClicks": 1 },
    });

    await Analytics.create({
      metric: "contact_clicks",
      value: 1,
      dimensions: {
        businessId: business._id,
        city: business.city,
        category: business.category,
        userId: req.user?.userId,
      },
      timestamp: new Date(),
      granularity: "hour",
    });

    return res.status(200).json({
      success: true,
      message: "Contact click tracked",
    });
  } catch (error) {
    logger.error("Track business contact click error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to track contact click",
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

    const business = await Business.findOne({
      _id: id,
      ownerId: req.user?.userId,
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const allowedUpdates = [
      "name",
      "nameEn",
      "city",
      "category",
      "description",
      "address",
      "avatarUrl",
      "coverUrl",
      "licenseImageUrl",
      "contact",
      "socials",
      "delegate",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (business as any)[field] = updates[field];
      }
    });

    if (updates.location && updates.location.coordinates) {
      business.location = {
        type: "Point",
        coordinates: updates.location.coordinates,
      };
    }

    await business.save();

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
