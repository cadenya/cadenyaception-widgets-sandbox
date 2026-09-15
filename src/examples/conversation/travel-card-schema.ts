import { z } from "zod";

export const travelCardSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["destination", "activity", "stay", "itinerary"]),
  location: z.string(),
  description: z.string(),
  highlights: z.array(z.string()).max(30),
  timing: z.string(),
  budget: z.string(),
});
export type TravelCardData = z.infer<typeof travelCardSchema>;
