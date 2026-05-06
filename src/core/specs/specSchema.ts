import { z } from "zod";

export const appSpecSchema = z.object({
  appName: z.string(),
  appType: z.enum(["landing_page", "booking_app", "crud_dashboard", "internal_tool"]),
  summary: z.string(),
  targetUsers: z.array(z.string()),
  features: z.array(z.string()),
  pages: z.array(z.string()),
  authRequired: z.boolean(),
  dataNeeds: z.enum(["none", "mock", "basic_persistence"]),
  stylingNotes: z.array(z.string()),
  assumptions: z.array(z.string())
});

export type AppSpec = z.infer<typeof appSpecSchema>;
