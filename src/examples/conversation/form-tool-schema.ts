import { z } from "zod";

const jsonObject = z.record(z.string(), z.unknown());

/** Validate the envelope here; RJSF/AJV validate the supplied schema and field values. */
export const formToolArgumentsSchema = z.object({
  title: z.string().default("Complete this form"),
  description: z.string().default(""),
  schema: z.object({ type: z.literal("object") }).passthrough(),
  uiSchema: jsonObject.default({}),
  formData: jsonObject.default({}),
  submitLabel: z.string().default("Submit to agent"),
});
export type FormToolArguments = z.infer<typeof formToolArgumentsSchema>;
const formDecisionSchema = z.object({ status: z.enum(["submitted", "cancelled"]) });
export type FormDecision = z.infer<typeof formDecisionSchema>["status"];

/** Completed history must distinguish a cancellation from submitted preferences. */
export function readFormDecision(content: unknown): FormDecision | null {
  if (typeof content !== "string") return null;
  try {
    const result: unknown = JSON.parse(content);
    const parsed = formDecisionSchema.safeParse(result);
    return parsed.success ? parsed.data.status : null;
  } catch {
    return null;
  }
}
