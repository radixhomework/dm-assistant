import { Inject, Injectable } from "@nestjs/common";
import type { UpdateSettingsInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { settings } from "../database/schema.js";

export type InstanceSettings = {
  worldName: string | null;
  contentLanguage: "en" | "fr" | null;
  distanceUnit: string | null;
  weightUnit: string | null;
};

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getAll(): Promise<InstanceSettings> {
    const rows = await this.db.select().from(settings);
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return {
      worldName: (map.get("world_name") as string | undefined) ?? null,
      contentLanguage:
        (map.get("content_language") as "en" | "fr" | undefined) ?? null,
      distanceUnit: (map.get("distance_unit") as string | undefined) ?? null,
      weightUnit: (map.get("weight_unit") as string | undefined) ?? null,
    };
  }

  async update(input: UpdateSettingsInput): Promise<InstanceSettings> {
    const rows = Object.entries(input).map(([key, value]) => ({
      key: key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
      value,
    }));
    for (const row of rows) {
      await this.db
        .insert(settings)
        .values(row)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: row.value, updatedAt: new Date() },
        });
    }
    return this.getAll();
  }
}
