import { Module } from "@nestjs/common";
import { RelationshipsModule } from "../relationships/relationships.module.js";
import { EntitiesController } from "./entities.controller.js";
import { EntitiesService } from "./entities.service.js";

@Module({
  imports: [RelationshipsModule],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
