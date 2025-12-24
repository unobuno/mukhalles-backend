import { Response } from "express";
import { Bookmark, Business } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

export const getUserBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, city, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const bookmarks = await Bookmark.find({ userId: req.user?.userId })
      .populate("businessId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    let filteredBookmarks = bookmarks;

    if (city || category) {
      filteredBookmarks = bookmarks.filter((bookmark: any) => {
        const business = bookmark.businessId;
        if (!business) return false;
        if (city && business.city !== city) return false;
        if (category && business.category !== category) return false;
        return true;
      });
    }

    const total = await Bookmark.countDocuments({ userId: req.user?.userId });

    res.status(200).json({
      success: true,
      data: {
        bookmarks: filteredBookmarks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Get user bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get bookmarks",
    });
  }
};

export const addBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const existingBookmark = await Bookmark.findOne({
      userId: req.user?.userId,
      businessId: id,
    });

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: "Business already bookmarked",
      });
    }

    await Bookmark.create({
      userId: req.user?.userId,
      businessId: id,
    });

    await Business.findByIdAndUpdate(id, { $inc: { "stats.bookmarks": 1 } });

    return res.status(201).json({
      success: true,
      message: "Business bookmarked successfully",
      isBookmarked: true,
    });
  } catch (error) {
    logger.error("Add bookmark error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add bookmark",
    });
  }
};

export const removeBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const bookmark = await Bookmark.findOne({
      userId: req.user?.userId,
      businessId: id,
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found",
      });
    }

    await Bookmark.findByIdAndDelete(bookmark._id);
    await Business.findByIdAndUpdate(id, { $inc: { "stats.bookmarks": -1 } });

    return res.status(200).json({
      success: true,
      message: "Bookmark removed successfully",
      isBookmarked: false,
    });
  } catch (error) {
    logger.error("Remove bookmark error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove bookmark",
    });
  }
};
