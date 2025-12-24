import { Response } from "express";
import { City } from "../models";
import { AuthRequest } from "../types";
import logger from "../utils/logger";

// Get all cities (public endpoint)
export const getAllCities = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const cities = await City.find({ isActive: true })
      .select("-__v")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: cities,
    });
  } catch (error) {
    logger.error("Get all cities error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cities",
    });
  }
};

// Get city by ID
export const getCityById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const city = await City.findOne({ id, isActive: true }).select("-__v");

    if (!city) {
      res.status(404).json({
        success: false,
        message: "City not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: city,
    });
  } catch (error) {
    logger.error("Get city by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get city",
    });
  }
};

// Create new city (admin only)
export const createCity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id, name } = req.body;

    // Check if city with this ID already exists
    const existingCity = await City.findOne({ id });
    if (existingCity) {
      res.status(400).json({
        success: false,
        message: "City with this ID already exists",
      });
      return;
    }

    const city = new City({
      id,
      name,
    });

    await city.save();

    logger.info(`New city created: ${id} by user: ${req.user?.userId}`);

    res.status(201).json({
      success: true,
      message: "City created successfully",
      data: city,
    });
  } catch (error) {
    logger.error("Create city error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create city",
    });
  }
};

// Update city (admin only)
export const updateCity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const city = await City.findOne({ id });
    if (!city) {
      res.status(404).json({
        success: false,
        message: "City not found",
      });
      return;
    }

    if (name) {
      city.name = name;
    }

    if (typeof isActive === "boolean") {
      city.isActive = isActive;
    }

    await city.save();

    logger.info(`City updated: ${id} by user: ${req.user?.userId}`);

    res.status(200).json({
      success: true,
      message: "City updated successfully",
      data: city,
    });
  } catch (error) {
    logger.error("Update city error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update city",
    });
  }
};

// Delete city (admin only) - permanently removes the city
export const deleteCity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const city = await City.findOneAndDelete({ id });
    if (!city) {
      res.status(404).json({
        success: false,
        message: "City not found",
      });
      return;
    }

    logger.info(`City deleted permanently: ${id} by user: ${req.user?.userId}`);

    res.status(200).json({
      success: true,
      message: "City deleted successfully",
    });
  } catch (error) {
    logger.error("Delete city error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete city",
    });
  }
};

// Get all cities including inactive ones (admin only)
export const getAllCitiesAdmin = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const cities = await City.find().select("-__v").sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: cities,
    });
  } catch (error) {
    logger.error("Get all cities admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cities",
    });
  }
};
