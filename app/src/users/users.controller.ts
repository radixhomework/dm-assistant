import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createUserSchema } from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import { UsersService } from "./users.service.js";

@Controller("api/admin/users")
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Post()
  create(@Body() body: unknown) {
    const input = createUserSchema.parse(body);
    return this.usersService.create(input);
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() body: { status?: string }) {
    const status = body?.status === "blocked" ? "blocked" : "active";
    return this.usersService.setStatus(id, status);
  }
}
