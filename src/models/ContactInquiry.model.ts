import mongoose, { Document, Schema } from "mongoose";

export interface IContactInquiry extends Document {
  fullName: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  notes: Array<{
    content: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  assignedTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactInquirySchema = new Schema<IContactInquiry>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "closed"],
      default: "new",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    notes: [
      {
        content: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ContactInquirySchema.index({ status: 1, createdAt: -1 });
ContactInquirySchema.index({ email: 1 });
ContactInquirySchema.index({ phone: 1 });

export const ContactInquiry = mongoose.model<IContactInquiry>(
  "ContactInquiry",
  ContactInquirySchema
);
