import { z } from 'zod';

export const FeedbackTypeSchema = z.enum(["BUG", "SUGGESTION", "IMPROVEMENT", "FEATURE"]);
export const FeedbackPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const FeedbackStatusSchema = z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"]);

export const AdminActivityLogEntrySchema = z.object({
  id: z.string().optional(),
  adminId: z.string(),
  adminName: z.string().optional(),
  action: z.enum(["STATUS_CHANGE", "PRIORITY_CHANGE", "NOTE_UPDATE"]),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  note: z.string().optional(),
  timestamp: z.date().optional(),
});

export const FeedbackSchema = z.object({
  id: z.string().uuid().optional(),
  type: FeedbackTypeSchema,
  title: z.string().min(5, "Title must be at least 5 characters").max(120, "Title must be maximum 120 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  affectedArea: z.string().max(120).optional(),
  priority: FeedbackPrioritySchema.default("MEDIUM"),
  attachments: z.array(z.string()).optional().default([]),
  userEmail: z.string().email("Invalid email format").optional().or(z.literal('')),
  userId: z.string().optional(),
  userName: z.string().optional(),
  status: FeedbackStatusSchema.default("OPEN"),
  adminNotes: z.string().optional(),
  adminActivityLogs: z.array(AdminActivityLogEntrySchema).optional().default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  upvotes: z.number().default(0).optional(),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;
export type AdminActivityLogEntry = z.infer<typeof AdminActivityLogEntrySchema>;
