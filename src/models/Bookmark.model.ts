import mongoose, { Schema, Document } from "mongoose";

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
BookmarkSchema.index({ userId: 1, businessId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
