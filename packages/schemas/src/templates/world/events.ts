import { assetField, proseField, refMany, refOne, template } from "../factory.js";
import { calendarDateSchema, recurrenceSchema } from "../vocabulary.js";

export const events = template(
  {
    illustration: assetField,
    start: calendarDateSchema.optional(),
    end: calendarDateSchema.optional(),
    recurrence: recurrenceSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    origin: refOne("places"),
    geography: refMany("places"),
    characters: refMany("characters-and-entities"),
    events: refMany("events"),
  },
);
