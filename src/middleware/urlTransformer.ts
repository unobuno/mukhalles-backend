import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config();
/**
 * Global URL Transformer Middleware
 * Automatically transforms all /uploads/... paths in JSON responses to full URLs
 */

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || "http://192.168.8.108:4000";

// Pattern to match upload paths
const UPLOAD_PATH_REGEX = /^\/uploads\//;
// Pattern to match localhost URLs
const LOCALHOST_URL_REGEX = /^http:\/\/(localhost|127\.0\.0\.1):4000/;

/**
 * Recursively transform all URL fields in an object
 */
const transformUrls = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Replace localhost URLs with correct base URL
    if (LOCALHOST_URL_REGEX.test(obj)) {
      return obj.replace(LOCALHOST_URL_REGEX, SERVER_BASE_URL);
    }
    // Check if it's an upload path
    if (UPLOAD_PATH_REGEX.test(obj)) {
      return `${SERVER_BASE_URL}${obj}`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformUrls);
  }

  if (typeof obj === "object") {
    const transformed: any = {};
    for (const key of Object.keys(obj)) {
      transformed[key] = transformUrls(obj[key]);
    }
    return transformed;
  }

  return obj;
};

/**
 * Middleware that intercepts JSON responses and transforms upload URLs
 */
export const urlTransformer = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip transformation for upload routes - we want relative paths returned
  // so they get saved to DB and transformed later when fetching
  if (
    req.path.startsWith("/api/upload") ||
    req.originalUrl.includes("/upload")
  ) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    try {
      const cleanBody = JSON.parse(JSON.stringify(body));
      const transformedBody = transformUrls(cleanBody);
      return originalJson(transformedBody);
    } catch (error) {
      console.error("URL Transformation failed:", error);
      return originalJson(body);
    }
  };

  next();
};

export default urlTransformer;
