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
    dm_summary: proseField,
    order: orderSchema.optional(),
  },
  {
    campaign: refOne("campaign"),
  },
);
