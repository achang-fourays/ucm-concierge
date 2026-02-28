import { z } from "zod";

export const chatSchema = z.object({
  message: z.string().min(2),
  context_scope: z.enum(["travel", "agenda", "speakers", "briefing", "all"]).default("all"),
  attendeeId: z.string().min(2).optional(),
  attendee_id: z.string().min(2).optional(),
});

export const nudgeUpdateSchema = z.object({
  status: z.enum(["approved", "snoozed", "disabled"]),
});

export const eventSchema = z.object({
  title: z.string().min(3),
  city: z.string().min(2),
  venue: z.string().min(3),
  timezone: z.string().min(2),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const attendeeSchema = z.object({
  userId: z.string().min(2),
  executiveFlag: z.boolean().default(false),
});

export const travelUpdateSchema = z.object({
  notes: z.string().optional(),
  confirmationCode: z.string().optional(),
  location: z.string().optional(),
});

export const agendaUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  location: z.string().min(2).optional(),
});

export const speakerUpdateSchema = z.object({
  bio: z.string().min(10).optional(),
  title: z.string().min(2).optional(),
  org: z.string().min(2).optional(),
});
