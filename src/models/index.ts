// Export all models from a single entry point
export { default as User } from "./User.model";
export { default as Business } from "./Business.model";
export { default as Review } from "./Review.model";
export { default as Bookmark } from "./Bookmark.model";
export { default as Notification } from "./Notification.model";
export { default as AdminLog } from "./AdminLog.model";
export { default as Analytics } from "./Analytics.model";
export { default as OTPSession } from "./OTPSession.model";
export { default as Category } from "./Category.model";
export { default as City } from "./City.model";
export { default as Settings } from "./Settings.model";
export { ContactInquiry } from "./ContactInquiry.model";

// Re-export interfaces
export type { IUser } from "./User.model";
export type { IBusiness } from "./Business.model";
export type { IReview } from "./Review.model";
export type { IBookmark } from "./Bookmark.model";
export type { INotification } from "./Notification.model";
export type { IAdminLog } from "./AdminLog.model";
export type { IAnalytics } from "./Analytics.model";
export type { IOTPSession } from "./OTPSession.model";
export type { ICategory } from "./Category.model";
export type { ICity } from "./City.model";
export type { ISettings } from "./Settings.model";
