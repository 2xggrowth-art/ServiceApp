import { z } from 'zod';

// ============================================================
// Zod validation schemas for all user inputs
// Used at service boundaries before Supabase calls
// ============================================================

export const createJobSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerPhone: z.string().optional(),
  bike: z.string().min(2, 'Bike model must be at least 2 characters'),
  serviceType: z.enum(['regular', 'repair', 'makeover', 'insurance']).default('regular'),
  services: z.array(z.string()).optional(),
  checkinParts: z.array(z.string()).optional(),
  issue: z.string().optional(),
  priority: z.enum(['standard', 'urgent']).default('standard'),
  laborCharge: z.number().min(0, 'Charge cannot be negative').optional(),
});

export const paymentSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  method: z.enum(['cash', 'upi', 'card', 'credit']),
});

export const pinLoginSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

export const partsNeededSchema = z.object({
  jobId: z.string().min(1),
  parts: z.array(z.object({
    name: z.string().min(1),
    status: z.string().default('pending'),
  })).min(1, 'At least one part is required'),
});

export const bikeCreateSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  bikeModel: z.string().min(2, 'Bike model must be at least 2 characters'),
  registrationNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const customerCreateSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

export const partsUsageSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price cannot be negative'),
});

/** Validate and return typed data, or throw with user-friendly message */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(firstError?.message || 'Validation failed');
  }
  return result.data;
}
