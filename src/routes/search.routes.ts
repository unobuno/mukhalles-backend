import { Router, type Router as IRouter } from "express";
import { Business } from "../models";
import { searchLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();
router.use(searchLimiter);

router.get("/businesses", async (req, res) => {
  try {
    const {
      q,
      city,
      category,
      minRating,
      verified,
      featured,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isActive: true };

    if (q) query.$text = { $search: q as string };
    if (city) query.city = city;
    if (category) query.category = category;
    if (minRating) query.rating = { $gte: parseFloat(minRating as string) };
    if (verified === "true") query.verified = true;
    if (featured === "true") query.isFeatured = true;

    const [businesses, total] = await Promise.all([
      Business.find(query)
        .select("-services -__v")
        .sort({ score: { $meta: "textScore" }, rating: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Business.countDocuments(query),
    ]);

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
    res.status(500).json({
      success: false,
      message: "Failed to search businesses",
    });
  }
});

router.get("/suggestions", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Query parameter required",
      });
    }

    const suggestions = await Business.find({
      isActive: true,
      $or: [
        { name: { $regex: q as string, $options: "i" } },
        { city: { $regex: q as string, $options: "i" } },
      ],
    })
      .select("name city category")
      .limit(parseInt(limit as string))
      .lean();

    return res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get suggestions",
    });
  }
});

export default router;
