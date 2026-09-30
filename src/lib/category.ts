import type { Types } from "mongoose";
import type { CategoryDoc } from "@/models/Category";

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
};

export function serializeCategory(doc: CategoryDoc & { _id: Types.ObjectId }): CategoryDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    sortOrder: doc.sortOrder ?? 0,
    active: doc.active ?? true,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
