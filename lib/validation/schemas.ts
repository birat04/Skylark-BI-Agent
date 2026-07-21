import { z } from "zod";

// Groq often sends `null` for omitted optional tool fields — coerce to undefined.
const optionalString = z
  .string()
  .nullish()
  .transform((v) => v ?? undefined);

const optionalBoolean = z
  .boolean()
  .nullish()
  .transform((v) => v ?? undefined);

/** Groq sends literal `null` instead of `{}` for no-arg tools. */
export const emptyToolInputSchema = z.preprocess(
  (val) => (val == null ? {} : val),
  z.object({})
);

// Raw monday.com column shape after flattening (lib/monday/types.ts).
// Column ids (e.g. "status", "date4") are board-specific and get finalized
// once the real boards are provisioned — see doc/phase.md Phase 0.
export const rawWorkOrderSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.record(z.string(), z.string().nullable()),
});

export const rawDealSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.record(z.string(), z.string().nullable()),
});

export type RawWorkOrder = z.infer<typeof rawWorkOrderSchema>;
export type RawDeal = z.infer<typeof rawDealSchema>;

// Tool I/O contracts (see doc/rule.md §4 and doc/architecture.md §6) —
// every tool call is validated at this boundary, never trusted from the model as-is.
export const dealFilterSchema = z.object({
  sector: optionalString,
  stage: optionalString,
  closeDateFrom: optionalString,
  closeDateTo: optionalString,
});

export const workOrderFilterSchema = z.object({
  sector: optionalString,
  status: optionalString,
});

export const toolResultSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  caveats: z.array(z.string()),
  syncedAt: z.string().nullable(),
});
