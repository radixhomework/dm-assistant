import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { mergeTagSchema, renameTagSchema } from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import { TagsService } from "./tags.service.js";

/**
 * Instance-wide tag management (record-tags capability): admin only —
 * the actions rewrite every record carrying the tag, so they follow the
 * admin panel's access rules.
 */
@Controller("api/admin/tags")
@UseGuards(AdminGuard)
export class TagsAdminController {
  constructor(private readonly tagsService: TagsService) {}

  @Post("rename")
  rename(@Body() body: unknown) {
    const input = renameTagSchema.parse(body);
    return this.tagsService.rename(input);
  }

  @Post("merge")
  merge(@Body() body: unknown) {
    const input = mergeTagSchema.parse(body);
    return this.tagsService.merge(input);
  }
}
