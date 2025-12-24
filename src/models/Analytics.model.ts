import mongoose, { Schema, Document } from "mongoose";

interface IDimensions {
  businessId?: mongoose.Types.ObjectId;
  city?: string;
  category?: string;
  userId?: mongoose.Types.ObjectId;
}

export interface IAnalytics extends Document {
  metric: string;
  value: number;
  dimensions: IDimensions;
  timestamp: Date;
  granularity: string;
}

const DimensionsSchema = new Schema<IDimensions>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business" },
    city: { type: String },
    category: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    metric: {
      type: String,
      required: true,
      enum: [
        "business_views",
        "contact_clicks",
        "user_registrations",
        "bookmarks",
        "reviews",
      ],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    dimensions: { type: DimensionsSchema },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    granularity: {
      type: String,
      enum: ["hour", "day", "week", "month"],
      default: "day",
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for time-series queries
AnalyticsSchema.index({ metric: 1, timestamp: -1 });
AnalyticsSchema.index({ "dimensions.businessId": 1, timestamp: -1 });
AnalyticsSchema.index({ "dimensions.city": 1, metric: 1, timestamp: -1 });

export default mongoose.model<IAnalytics>("Analytics", AnalyticsSchema);
