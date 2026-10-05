import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./defineModel";

const AdminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type AdminDoc = InferSchemaType<typeof AdminSchema>;

export const Admin = defineModel<AdminDoc>("Admin", AdminSchema);
