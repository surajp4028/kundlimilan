import { z } from "zod";

export const couponInput = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "3–32 letters, numbers, _ or -"),
    title: z.string().trim().max(100).optional().nullable(),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive().max(100000),
    maxDiscount: z.number().positive().max(100000).optional().nullable(),
    minOrder: z.number().positive().max(1000000).optional().nullable(),
    service: z.string().regex(/^[a-z0-9-]{2,48}$/).optional().nullable(),
    perUserLimit: z.number().int().min(1).max(1000).optional().nullable(),
    totalLimit: z.number().int().min(1).max(1000000).optional().nullable(),
    userUid: z.string().trim().toUpperCase().regex(/^AST\d{8}$/, "Customer ID like AST12345678").optional().nullable().or(z.literal("")),
    status: z.enum(["active", "paused"]).default("active"),
    startsAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, { message: "Percent must be 1–100", path: ["value"] });
export type CouponInput = z.infer<typeof couponInput>;

const dt = (s?: string | null) => (s ? new Date(s).toISOString().slice(0, 19).replace("T", " ") : null);
export const couponValues = (b: CouponInput) => [
  b.code, b.title || null, b.type, b.value, b.maxDiscount ?? null, b.minOrder ?? null, b.service || null, b.perUserLimit ?? null, b.totalLimit ?? null,
  b.userUid || null, b.status, dt(b.startsAt), dt(b.expiresAt),
];
