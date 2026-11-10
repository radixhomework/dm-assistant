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
