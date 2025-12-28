import { Response } from "express";
import mongoose from "mongoose";
import { Category, Business } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

// Get all categories (public endpoint)
export const getAllCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { featured, search, page = 1, limit = 100 } = req.query;

    const query: any = { isActive: true };

    if (featured === "true") {
      query.isFeatured = true;
    }

    if (search) {
      const trimmedSearch = (search as string).trim();
      if (trimmedSearch) {
        const searchRegex = new RegExp(trimmedSearch, "i");
        query.title = searchRegex;
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const categories = await Category.find(query)
      .select("-__v")
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error("Get all categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
    });
  }
};

// Get all categories including inactive ones (admin only)
export const getAllCategoriesAdmin = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const categories = await Category.find()
      .select("-__v")
      .sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error("Get all categories admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
    });
  }
};

// Get category by ID
export const getCategoryById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findOne({ id, isActive: true }).select(
      "-__v"
    );

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error("Get category by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get category",
    });
  }
};

// Create new category (admin only)
export const createCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, title, imageUrl, isFeatured } = req.body;

    // Use provided ID or generate a random one
    const categoryId = id || new mongoose.Types.ObjectId().toString();

    // Check if category with this ID already exists
    const existingCategory = await Category.findOne({ id: categoryId });
    if (existingCategory) {
      res.status(400).json({
        success: false,
        message: "Category with this ID already exists",
      });
      return;
    }

    const category = new Category({
      id: categoryId,
      title,
      imageUrl: imageUrl || null,
      isFeatured: isFeatured || false,
    });

    await category.save();

    logger.info(
      `New category created: ${categoryId} by user: ${req.user?.userId}`
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    logger.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// Update category (admin only)
export const updateCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, isActive, imageUrl, isFeatured } = req.body;

    const category = await Category.findOne({ id });
    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    if (title) {
      category.title = title;
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    if (typeof isFeatured === "boolean") {
      category.isFeatured = isFeatured;
    }

    if (imageUrl !== undefined) {
      category.imageUrl = imageUrl;
    }

    await category.save();

    logger.info(`Category updated: ${id} by user: ${req.user?.userId}`);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    logger.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// Delete category (admin only) - Hard delete with optional migration
export const deleteCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { transferToId } = req.body;

    const category = await Category.findOne({ id });
    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    if (transferToId) {
      const targetCategory = await Category.findOne({ id: transferToId });
      if (!targetCategory) {
        res.status(404).json({
          success: false,
          message: "Transfer category not found",
        });
        return;
      }

      // Migrate businesses
      // Match against ID and Title to catch inconsistent data
      const oldIdentifiers = [category.id, category.title].filter(Boolean);

      await Business.updateMany(
        { category: { $in: oldIdentifiers } },
        { category: targetCategory.id }
      );
    }

    // Hard delete
    await Category.deleteOne({ id });

    logger.info(
      `Category deleted: ${id} (transferred to: ${transferToId || "none"})`
    );

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    logger.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

// Reorder categories (admin only)
export const reorderCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      res.status(400).json({
        success: false,
        message: "orderedIds must be an array",
      });
      return;
    }

    const bulkOps = orderedIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { id: id },
        update: { order: index },
      },
    }));

    await Category.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    logger.error("Reorder categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder categories",
    });
  }
};
