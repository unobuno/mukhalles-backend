import mongoose, { Schema, Document } from "mongoose";
import { AdminActionType } from "../types";

interface ITarget {
  type: string;
  id: mongoose.Types.ObjectId;
}

interface IDetails {
  oldValues?: any;
  newValues?: any;
  reason?: string;
}

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: AdminActionType;
  target: ITarget;
  details: IDetails;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const TargetSchema = new Schema<ITarget>(
  {
    type: {
      type: String,
      required: true,
      enum: ["user", "business", "review", "document", "category"],
    },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false }
);

const DetailsSchema = new Schema<IDetails>(
  {
    oldValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    reason: { type: String },
  },
  { _id: false }
);

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AdminActionType),
      required: true,
    },
    target: { type: TargetSchema, required: true },
    details: { type: DetailsSchema },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ "target.type": 1, "target.id": 1 });

export default mongoose.model<IAdminLog>("AdminLog", AdminLogSchema);
