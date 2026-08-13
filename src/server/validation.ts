import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u);

export const passwordSchema = z.string().min(10).max(128);

export const timezoneSchema = z.string().trim().min(1).max(64).refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "INVALID_TIMEZONE");

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.union([z.email().max(254), z.literal("")]).optional(),
  password: passwordSchema,
  timezone: timezoneSchema.default("Europe/Warsaw"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1).max(40).regex(/^[^<>]*$/),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});
