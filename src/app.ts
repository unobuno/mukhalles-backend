import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import path from "path";

import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import notFoundHandler from "./middleware/notFoundHandler";
import urlTransformer from "./middleware/urlTransformer";

// Import routes
import authRoutes from "./routes/auth.routes";
import adminAuthRoutes from "./routes/adminAuth.routes";
import userRoutes from "./routes/user.routes";
import companyRoutes from "./routes/company.routes";
import businessRoutes from "./routes/business.routes";
import reviewRoutes from "./routes/review.routes";
import bookmarkRoutes from "./routes/bookmark.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import uploadRoutes from "./routes/upload.routes";
import searchRoutes from "./routes/search.routes";
import analyticsRoutes from "./routes/analytics.routes";
import categoryRoutes from "./routes/category.routes";
import cityRoutes from "./routes/city.routes";
import adminSettingsRoutes from "./routes/adminSettings.routes";
import adminNotificationsRoutes from "./routes/adminNotifications.routes";
import contactRoutes from "./routes/contact.routes";

const app: Application = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(urlTransformer);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cities", cityRoutes);

// Admin Settings Routes
app.use("/api/admin/settings", adminSettingsRoutes);
// Admin Notifications Routes
app.use("/api/admin/notifications", adminNotificationsRoutes);
// Contact Routes
app.use("/api/contact", contactRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
