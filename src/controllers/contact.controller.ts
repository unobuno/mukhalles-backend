import { Request, Response } from "express";
import { ContactInquiry } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

// Public: Create contact inquiry
export const createInquiry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!fullName || !message) {
      return res.status(400).json({
        success: false,
        message: "Name and message are required",
      });
    }

    // Require at least one contact method
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required",
      });
    }

    const inquiry = await ContactInquiry.create({
      fullName,
      email,
      phone,
      subject,
      message,
      status: "new",
      priority: "normal",
    });

    logger.info(`New contact inquiry created: ${inquiry._id}`);

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: { id: inquiry._id },
    });
  } catch (error) {
    logger.error("Create contact inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit inquiry",
    });
  }
};

// Admin: Get all inquiries with filters
export const getInquiries = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [inquiries, total, stats] = await Promise.all([
      ContactInquiry.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate("assignedTo", "phone individualProfile.fullName")
        .lean(),
      ContactInquiry.countDocuments(query),
      ContactInquiry.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format stats
    const statusCounts = {
      new: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      total: 0,
    };
    stats.forEach((s) => {
      statusCounts[s._id as keyof typeof statusCounts] = s.count;
      statusCounts.total += s.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        inquiries,
        stats: statusCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get inquiries error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get inquiries",
    });
  }
};

// Admin: Get single inquiry
export const getInquiryById = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const inquiry = await ContactInquiry.findById(id)
      .populate("notes.createdBy", "phone individualProfile.fullName")
      .populate("assignedTo", "phone individualProfile.fullName")
      .lean();

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    logger.error("Get inquiry by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get inquiry",
    });
  }
};

// Admin: Update inquiry status
export const updateInquiryStatus = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      }
    }
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;

    const inquiry = await ContactInquiry.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    logger.info(`Inquiry ${id} updated: status=${status}`);

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",
      data: inquiry,
    });
  } catch (error) {
    logger.error("Update inquiry status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update inquiry",
    });
  }
};

// Admin: Add note to inquiry
export const addNote = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Note content is required",
      });
    }

    const inquiry = await ContactInquiry.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            content,
            createdBy: req.user?.userId,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).populate("notes.createdBy", "phone individualProfile.fullName");

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      data: inquiry,
    });
  } catch (error) {
    logger.error("Add note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
};

// Admin: Delete inquiry
export const deleteInquiry = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const inquiry = await ContactInquiry.findByIdAndDelete(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    logger.info(`Inquiry ${id} deleted`);

    return res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    logger.error("Delete inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete inquiry",
    });
  }
};
