import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "../types";

interface IIndividualProfile {
  fullName: string;
  email?: string;
  city?: string;
  avatarUrl?: string;
  notificationChannel?: string;
  termsAccepted: boolean;
}

interface INotificationPreferences {
  offices: string;
  updates: string;
  categories: string;
  enablePush: boolean;
  enableEmail: boolean;
  enableWhatsApp: boolean;
  enableSMS: boolean;
}

export interface IUser extends Document {
  phone: string;
  email?: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  pushToken?: string;
  individualProfile?: IIndividualProfile;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const IndividualProfileSchema = new Schema<IIndividualProfile>({
  fullName: { type: String },
  email: { type: String },
  city: { type: String },
  avatarUrl: { type: String },
  notificationChannel: {
    type: String,
    enum: ["email", "whatsapp"],
    default: "email",
  },
  termsAccepted: { type: Boolean, default: false },
});

const NotificationPreferencesSchema = new Schema<INotificationPreferences>({
  offices: {
    type: String,
    enum: ["all", "followed", "none"],
    default: "all",
  },
  updates: {
    type: String,
    enum: ["all", "important", "none"],
    default: "important",
  },
  categories: {
    type: String,
    enum: ["all", "selected", "none"],
    default: "all",
  },
  enablePush: { type: Boolean, default: true },
  enableEmail: { type: Boolean, default: true },
  enableWhatsApp: { type: Boolean, default: false },
  enableSMS: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.INDIVIDUAL,
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    pushToken: { type: String },
    individualProfile: IndividualProfileSchema,
    notificationPreferences: {
      type: NotificationPreferencesSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ "individualProfile.city": 1 });

export default mongoose.model<IUser>("User", UserSchema);
