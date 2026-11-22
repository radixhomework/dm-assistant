import { Module } from "@nestjs/common";
import { RelationshipsModule } from "../relationships/relationships.module.js";
import { EntitiesController } from "./entities.controller.js";
import { EntitiesService } from "./entities.service.js";
import { TagsAdminController } from "./tags-admin.controller.js";
import { TagsController } from "./tags.controller.js";
import { TagsService } from "./tags.service.js";

@Module({
  imports: [RelationshipsModule],
  controllers: [EntitiesController, TagsController, TagsAdminController],
  providers: [EntitiesService, TagsService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
