import { Module } from "@nestjs/common";
import { CatalogSourcesAdminController } from "./sources.controller.js";
import { CatalogSourcesController } from "./sources.controller.js";
import { CatalogSourcesService } from "./sources.service.js";

@Module({
  controllers: [CatalogSourcesController, CatalogSourcesAdminController],
  providers: [CatalogSourcesService],
  exports: [CatalogSourcesService],
})
export class CatalogSourcesModule {}
