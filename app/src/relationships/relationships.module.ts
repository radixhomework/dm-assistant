import { Module } from "@nestjs/common";
import { RelationshipsService } from "./relationships.service.js";

@Module({
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
