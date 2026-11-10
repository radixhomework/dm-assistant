/**
 * "Scene" template schema — campaign perimeter.
 * 
 * Source of truth: templates/campaign/scene.md. The chapter reference is
 * the child→parent link (relationships kind = this field key);
 * running_notes holds the multi-block running prose (typed blocks:
 * :::attention / :::mechanics); play_status drives the upward tracking
 * fold. Order carries the scene's play order.
 */

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
