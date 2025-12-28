import mongoose, { Schema, Document } from "mongoose";

export interface ICity extends Document {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema = new Schema<ICity>(
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CitySchema.index({ isActive: 1 });

export default mongoose.model<ICity>("City", CitySchema);
