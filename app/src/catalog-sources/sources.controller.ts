import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createSourceSchema,
  sourceIdSchema,
  updateSourceSchema,
} from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import { CatalogSourcesService } from "./sources.service.js";

/**
 * Registry listing for import selection, badges and the attribution
 * page: authenticated for all DM accounts (the badges and the credits
 * page are DM-facing, the import tab is admin-only and filters there).
 */
@Controller("api/sources")
export class CatalogSourcesController {
  constructor(private readonly sources: CatalogSourcesService) {}

  @Get()
  list() {
    return this.sources.list();
  }
}

/**
 * Administrator management of named external sources: create, rename,
 * attribution note, disable toggle. The built-in Internal source
 * refuses every update server-side (source_immutable).
 */
@Controller("api/admin/sources")
@UseGuards(AdminGuard)
export class CatalogSourcesAdminController {
  constructor(private readonly sources: CatalogSourcesService) {}

  @Post()
  create(@Body() body: unknown) {
    const input = createSourceSchema.parse(body);
    return this.sources.create(input);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown) {
    const sourceId = sourceIdSchema.parse(id);
    const input = updateSourceSchema.parse(body);
    return this.sources.update(sourceId, input);
  }
}
