import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { updateSettingsSchema } from "@dm/schemas";
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
}
