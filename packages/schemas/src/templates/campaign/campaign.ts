/**
 * "Campaign" template schema — campaign perimeter; the container of
 * chapters (a one-shot is a campaign with a single chapter).
 * 
 * Source of truth: templates/campaign/campaign.md. Chapters list at the
 * end of the sheet through backlinks, in play order.
 */

import { assetField, proseField, template } from "../factory.js";

export const campaign = template({
  illustration: assetField,
  pitch: proseField,
  dm_summary: proseField,
});
