import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  id: string;
  title: string;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ isFeatured: 1, isActive: 1 });
CategorySchema.index({ order: 1 });

export default mongoose.model<ICategory>("Category", CategorySchema);
