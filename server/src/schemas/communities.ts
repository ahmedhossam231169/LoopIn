import { z } from "zod";

export const COMMUNITY_CATEGORIES = [
  "Frontend", "Backend", "AI & ML", "DevOps", "Mobile", "Data",
] as const;

export const createCommunitySchema = z.object({
  name: z.string().min(3, "Name is too short").max(60, "Name is too long"),
  description: z.string().max(300).optional(),
  category: z.enum(COMMUNITY_CATEGORIES),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
