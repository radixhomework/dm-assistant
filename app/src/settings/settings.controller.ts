import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { calendarSettingsSchema, updateSettingsSchema } from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import { SettingsService } from "./settings.service.js";

@Controller("api/admin/settings")
@UseGuards(AdminGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get() {
    return this.settingsService.getAll();
  }

  @Patch()
  update(@Body() body: unknown) {
    const input = updateSettingsSchema.parse(body);
    return this.settingsService.update(input);
  }

  @Patch("calendar")
  updateCalendar(@Body() body: unknown) {
    const input = calendarSettingsSchema.parse(body);
    return this.settingsService.updateCalendar(input);
  }
}

/** Authenticated read of the calendar definition (year overview, date
 * picker and date node all consume it; only the admin edits it). */
@Controller("api/settings")
export class CalendarSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("calendar")
  getCalendar() {
    return this.settingsService.getCalendar();
  }
}
