import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  key: string;
  supportEmail: string;
  supportPhone: string;
  updatedAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "app_settings",
    },
    supportEmail: { type: String, default: "support@mukhalis.com" },
    supportPhone: { type: String, default: "+966500000001" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISettings>("Settings", SettingsSchema);
