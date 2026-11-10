/**
 * "Events" template schema — world perimeter (Chronicle category); the
 * Events records are the calendar registry.
 * 
 * Source of truth: templates/world/chronicle/events.md. start/end are
 * calendar dates — both set means a period, start alone a punctual event;
 * recurrence is anchored on the start date. Day-by-day occurrence
 * computation for the year overview lives in the calendar module.
 */

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
