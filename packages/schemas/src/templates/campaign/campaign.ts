import { assetField, proseField, template } from "../factory.js";

export const campaign = template({
  illustration: assetField,
  pitch: proseField,
  dm_summary: proseField,
});
