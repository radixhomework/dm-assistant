import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import {
  distanceUnits,
  volumeUnits,
  weightUnits,
  type UpdateSettingsInput,
} from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { settings } from "../database/schema.js";

export type InstanceSettings = {
  worldName: string | null;
  distanceUnit: "m" | "ft";
  weightUnit: "kg" | "lb";
  volumeUnit: "L" | "gal";
};

/** Closed-list read: an invalid stored value falls back to the first entry. */
function unitSetting(
  map: Map<string, unknown>,
  key: string,
  values: readonly string[],
): string {
  const stored = map.get(key);
  return values.includes(stored as string) ? (stored as string) : values[0];
}

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getAll(): Promise<InstanceSettings> {
    const rows = await this.db.select().from(settings);
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return {
      worldName: (map.get("world_name") as string | undefined) ?? null,
      distanceUnit: unitSetting(map, "distance_unit", distanceUnits) as
        | "m"
        | "ft",
      weightUnit: unitSetting(map, "weight_unit", weightUnits) as "kg" | "lb",
      volumeUnit: unitSetting(map, "volume_unit", volumeUnits) as "L" | "gal",
    };
  }

  async update(input: UpdateSettingsInput): Promise<InstanceSettings> {
    const rows = Object.entries(input).map(([key, value]) => ({
      key: key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
      value,
    }));
    if (rows.length > 0) {
      await this.db
        .insert(settings)
        .values(rows)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: sql`excluded.value`, updatedAt: new Date() },
        });
    }
    return this.getAll();
  }
}
