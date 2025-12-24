/**
 * URL Helper Utility
 * Converts relative upload paths to full URLs
 */
import dotenv from "dotenv";
dotenv.config();

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || "http://localhost:3000";

/**
 * Converts a relative path to a full URL
 * @param relativePath - The relative path (e.g., /uploads/avatars/image.jpg)
 * @returns Full URL or null if path is empty
 */
export const getFullUrl = (
  relativePath: string | undefined | null
): string | null => {
  if (!relativePath) return null;

  // If already a full URL, return as-is
  if (
    relativePath.startsWith("http://") ||
    relativePath.startsWith("https://")
  ) {
    return relativePath;
  }

  // Ensure path starts with /
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  return `${SERVER_BASE_URL}${path}`;
};

/**
 * Wraps an object's URL fields with full URLs
 * @param obj - Object containing URL fields
 * @param urlFields - Array of field names that contain URLs
 * @returns Object with full URLs
 */
export const wrapUrlFields = <T extends Record<string, any>>(
  obj: T,
  urlFields: string[]
): T => {
  if (!obj) return obj;

  const result = { ...obj };

  for (const field of urlFields) {
    if (result[field]) {
      (result as any)[field] = getFullUrl(result[field]);
    }
  }

  return result;
};

export default { getFullUrl, wrapUrlFields };
