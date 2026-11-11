import { z } from "zod";
import { locales } from "./env.js";

export const passwordSchema = z.string().min(12).max(128);

/**
 * Login name: lowercase letters, digits, dots, dashes and underscores —
 * unique per instance. The email stays a profile field, not the login.
 */
export const usernameSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "lowercase letters, digits, dots, dashes and underscores");

export const loginSchema = z.object({
  identifier: z.string().min(1).max(200),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  username: usernameSchema,
  email: z.email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  role: z.enum(["admin", "dm"]).default("dm"),
});

export const wizardSchema = z.object({
  username: usernameSchema,
  email: z.email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  worldName: z.string().min(1).max(120),
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
