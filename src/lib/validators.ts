import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Customer schemas
export const customerSchema = z.object({
  name: z.coerce.string().optional().default(""),
  house: z.string().min(1, "House is required"),
  ratePerBottle: z.coerce.number().positive("Rate must be a positive number"),
});

export const customerExcelRowSchema = z.object({
  Name: z.coerce.string().optional().default(""),
  House: z.string().min(1, "House is required"),
  RatePerBottle: z.coerce.number().positive("Rate must be a positive number"),
});

// Sale schemas
export const saleSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  date: z.coerce.date(),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
});

export const saleUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer").optional(),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative").optional(),
});

export const salesExcelRowSchema = z.object({
  Name: z.coerce.string().optional().default(""),
  House: z.string().min(1, "House is required"),
  Date: z.coerce.date(),
  Quantity: z.coerce.number().int().positive("Quantity must be positive"),
  AmountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;
