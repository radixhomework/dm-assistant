import { z } from "zod";
import { locales } from "./env.js";

export const passwordSchema = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  role: z.enum(["admin", "dm"]).default("dm"),
});

export const wizardSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(80),
  worldName: z.string().min(1).max(120),
  contentLanguage: z.enum(locales),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type WizardInput = z.infer<typeof wizardSchema>;
