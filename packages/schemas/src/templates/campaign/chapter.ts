/**
 * "Chapter" template schema — campaign perimeter.
 * 
 * Source of truth: templates/campaign/chapter.md. The campaign reference
 * is the child→parent link, stored as a relationship row with kind equal
 * to this field key. Order carries the chapter's play order.
 */

import { assetField, proseField, refOne, template } from "../factory.js";
import { orderSchema } from "../vocabulary.js";

export const chapter = template(
  {
    illustration: assetField,
    order: orderSchema.optional(),
    dm_summary: proseField,
  },
  {
    campaign: refOne("campaign"),
  },
);
