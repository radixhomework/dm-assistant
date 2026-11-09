import { z } from "zod";
import { locales } from "./env.js";

export const passwordSchema = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  role: z.enum(["admin", "dm"]).default("dm"),
});

export const wizardSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  worldName: z.string().min(1).max(120),
  contentLanguage: z.enum(locales).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type WizardInput = z.infer<typeof wizardSchema>;

export const updateProfileSchema = z
  .object({
    email: z.email(),
    displayName: z.string().min(1).max(80),
    uiLocale: z.enum(locales),
  })
  .partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
