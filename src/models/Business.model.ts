import mongoose, { Schema, Document } from "mongoose";
import { OfficeCategory, VerificationStatus, UploadStatus } from "../types";

interface ISubService {
  _id?: mongoose.Types.ObjectId;
  title: string;
  price: number;
  isActive: boolean;
}

interface IService {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  imageUrl?: string;
  basePrice: number;
  isActive: boolean;
  subServices: ISubService[];
  createdAt: Date;
  updatedAt: Date;
}

interface IContact {
  phone: string;
  whatsapp?: string;
}

interface ISocials {
  facebook?: string;
  x?: string;
  linkedin?: string;
  snapchat?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  telegram?: string;
}

interface ILocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface IDelegate {
  fullName: string;
  nationalId: string;
  position: string;
  phone: string;
  whatsapp?: string;
  email: string;
  birthDate?: string;
}

interface IDocument {
  _id?: mongoose.Types.ObjectId;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadStatus: UploadStatus;
  uploadedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  uploadedAt: Date;
  rejectionReason?: string;
  reviewNotes?: string;
}

interface IReviewIssue {
  fieldName: string;
  fieldLabel: string;
  issueType: "missing" | "incorrect" | "unclear" | "expired" | "invalid";
  description: string;
  isResolved: boolean;
}

interface IStats {
  profileViews: number;
  contactClicks: number;
  bookmarks: number;
}

export interface IBusiness extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  nameEn?: string;
  description?: string;
  category: OfficeCategory;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  featuredPriority: number;
  order: number;
  avatarUrl?: string;
  coverUrl?: string;
  verified: boolean;
  // Legal/Business Information
  crNumber: string;
  vatNumber?: string;
  licenseNumber: string;
  city: string;
  nationalAddress?: string;
  website?: string;
  // Contact Information
  contact: IContact;
  socials?: ISocials;
  location?: ILocation;
  address?: string;
  mapLink?: string;
  foundationDate?: Date;
  workDays?: string[];
  workTime?: {
    from?: string;
    to?: string;
    custom?: Map<string, { from: string; to: string }>;
  };
  // Business Operations
  services: IService[];
  delegate: IDelegate;
  documents: IDocument[];
  // Stats & Analytics
  stats: IStats;
  // Review System
  verificationStatus: VerificationStatus;
  isResubmission?: boolean; // true if pending after rejection edit
  reviewIssues?: IReviewIssue[];
  reviewNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Sub Service Schema
const SubServiceSchema = new Schema<ISubService>({
  title: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
});

// Service Schema
const ServiceSchema = new Schema<IService>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    subServices: [SubServiceSchema],
  },
  {
    timestamps: true,
  }
);

// Contact Schema
const ContactSchema = new Schema<IContact>({
  phone: { type: String, required: true },
  whatsapp: { type: String },
});

// Socials Schema
const SocialsSchema = new Schema<ISocials>({
  facebook: { type: String },
  x: { type: String },
  linkedin: { type: String },
  snapchat: { type: String },
  instagram: { type: String },
  tiktok: { type: String },
  youtube: { type: String },
  telegram: { type: String },
});

// Location Schema
const LocationSchema = new Schema<ILocation>({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function (v: number[]) {
        return (
          v.length === 2 &&
          v[0] >= -180 &&
          v[0] <= 180 &&
          v[1] >= -90 &&
          v[1] <= 90
        );
      },
      message: "Invalid coordinates. Must be [longitude, latitude]",
    },
  },
});

// Review Issue Schema
const ReviewIssueSchema = new Schema<IReviewIssue>({
  fieldName: { type: String, required: true },
  fieldLabel: { type: String, required: true },
  issueType: {
    type: String,
    enum: ["missing", "incorrect", "unclear", "expired", "invalid"],
    required: true,
  },
  description: { type: String, required: true },
  isResolved: { type: Boolean, default: false },
});

// Document Schema
const DocumentSchema = new Schema<IDocument>({
  documentType: {
    type: String,
    required: true,
    enum: [
      "cr",
      "power_of_attorney",
      "chamber_certificate",
      "delegate_id",
      "powerOfAttorney",
      "chamberCertificate",
      "delegateId",
    ],
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadStatus: {
    type: String,
    enum: Object.values(UploadStatus),
    default: UploadStatus.PENDING,
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  uploadedAt: { type: Date, default: Date.now },
  rejectionReason: { type: String },
  reviewNotes: { type: String },
});

// Delegate Schema
const DelegateSchema = new Schema<IDelegate>({
  fullName: { type: String, required: true },
  nationalId: { type: String, required: true },
  position: { type: String, required: true },
  phone: { type: String, required: true },
  whatsapp: { type: String },
  email: { type: String, required: true },
  birthDate: { type: String },
});

// Stats Schema
const StatsSchema = new Schema<IStats>({
  profileViews: { type: Number, default: 0 },
  contactClicks: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
});

// Main Business Schema
const BusinessSchema = new Schema<IBusiness>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    category: {
      type: String,
      required: true,
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    featuredPriority: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    avatarUrl: { type: String },
    coverUrl: { type: String },
    verified: { type: Boolean, default: false },

    // Legal/Business Information
    crNumber: { type: String, unique: true, sparse: true },
    vatNumber: { type: String },
    licenseNumber: { type: String },
    city: { type: String, required: true },
    nationalAddress: { type: String },
    website: { type: String },

    // Contact Information
    contact: { type: ContactSchema, required: true },
    socials: SocialsSchema,
    location: LocationSchema,
    address: { type: String },
    mapLink: { type: String },

    // Work Info
    foundationDate: { type: Date },
    workDays: [{ type: String }],
    workTime: {
      from: { type: String },
      to: { type: String },
      custom: {
        type: Map,
        of: new Schema({ from: String, to: String }, { _id: false }),
      },
    },

    // Business Operations
    services: [ServiceSchema],
    delegate: { type: DelegateSchema, required: true },
    documents: [DocumentSchema],

    // Stats & Analytics
    stats: { type: StatsSchema, default: () => ({}) },

    // Review System
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
    },
    isResubmission: { type: Boolean, default: false },
    reviewIssues: [ReviewIssueSchema],
    reviewNotes: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
BusinessSchema.index({ city: 1, category: 1, isActive: 1 });
BusinessSchema.index({ order: -1, isFeatured: -1, featuredPriority: -1 });
BusinessSchema.index({ rating: -1, ratingCount: -1 });
BusinessSchema.index({ verificationStatus: 1 });
BusinessSchema.index({ createdAt: -1 });

// Compound indexes for common queries
BusinessSchema.index({
  city: 1,
  category: 1,
  isActive: 1,
  isFeatured: -1,
  rating: -1,
});

// Text search index for business discovery
BusinessSchema.index(
  {
    name: "text",
    nameEn: "text",
    description: "text",
    city: "text",
    crNumber: "text",
  },
  {
    weights: { name: 10, nameEn: 10, description: 5, city: 3, crNumber: 8 },
    name: "business_text_search",
  }
);

// Geospatial index for location-based search
BusinessSchema.index({ location: "2dsphere" });

export default mongoose.model<IBusiness>("Business", BusinessSchema);
