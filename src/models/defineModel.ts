import { deleteModel, model, models, type Model, type Schema } from "mongoose";

/**
 * ลงทะเบียน model ครั้งเดียว — Next โหลดไฟล์ model ซ้ำได้หลายรอบ (หลาย route / hot-reload)
 * dev: mongoose จำ model ตัวแรกไว้ทั้งที่ schema ในไฟล์เปลี่ยนแล้ว → field ใหม่ถูกทิ้งเงียบ ๆ จนกว่าจะรีสตาร์ท
 *      จึงลบตัวเก่าแล้วสร้างใหม่ทุกครั้งที่ไฟล์ถูกโหลด
 */
export function defineModel<T>(name: string, schema: Schema): Model<T> {
  if (process.env.NODE_ENV !== "production" && models[name]) deleteModel(name);
  // cast ทางเดียว — ให้ TypeScript เทียบ generic ของ mongoose ทั้งชุดแล้วหน่วยความจำไม่พอ
  return (models[name] ?? model(name, schema)) as unknown as Model<T>;
}
