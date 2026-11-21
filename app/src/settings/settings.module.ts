import { Module } from "@nestjs/common";
import { CalendarSettingsController, SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

@Module({
  controllers: [SettingsController, CalendarSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
