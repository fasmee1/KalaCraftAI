// ช่วงเวลาของแดชบอร์ด — ใช้ร่วมกันทั้ง server และ client
export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];
