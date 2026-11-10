import { z } from "zod";
import { assetField, proseField, refOne, template } from "../factory.js";
import { orderSchema } from "../vocabulary.js";
import { playStatuses } from "../../entities.js";

export const scene = template(
  {
    illustration: assetField,
    dm_summary: proseField,
    running_notes: proseField,
    play_status: z.enum(playStatuses).optional(),
    order: orderSchema.optional(),
  },
  {
    chapter: refOne("chapter"),
  },
);
