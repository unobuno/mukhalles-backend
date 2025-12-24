import mongoose, { Schema, Document } from "mongoose";

interface ILike {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IReview extends Document {
  businessId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  serviceTag?: string;
  likes: ILike[];
  likesCount: number;
  isApproved: boolean;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<ILike>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const ReviewSchema = new Schema<IReview>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: { type: String, required: true },
    serviceTag: { type: String },
    likes: [LikeSchema],
    likesCount: { type: Number, default: 0, min: 0 },
    isApproved: { type: Boolean, default: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ businessId: 1, isApproved: 1, createdAt: -1 });
ReviewSchema.index({ businessId: 1, rating: -1 });
ReviewSchema.index({ "likes.userId": 1 });
ReviewSchema.index({ isApproved: 1 });

// Compound index for user review uniqueness per business
ReviewSchema.index({ userId: 1, businessId: 1 });

export default mongoose.model<IReview>("Review", ReviewSchema);
