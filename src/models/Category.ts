import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./defineModel";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;

export const Category = defineModel<CategoryDoc>("Category", CategorySchema);
