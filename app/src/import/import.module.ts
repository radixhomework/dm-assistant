import { Module } from "@nestjs/common";
import { CatalogSourcesModule } from "../catalog-sources/catalog-sources.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { ImportController } from "./import.controller.js";
import { ImportService } from "./import.service.js";

@Module({
  imports: [CatalogSourcesModule, SettingsModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
