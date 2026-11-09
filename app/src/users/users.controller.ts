import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { createUserSchema, resetPasswordSchema } from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import type { AuthedRequest } from "../auth/auth.guard.js";
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

  @Post(":id/password")
  resetPassword(@Param("id") id: string, @Body() body: unknown) {
    const { newPassword } = resetPasswordSchema.parse(body);
    return this.usersService.setPassword(id, newPassword);
  }

  @HttpCode(204)
  @Delete(":id")
  delete(@Param("id") id: string, @Req() req: AuthedRequest) {
    return this.usersService.deleteUser(id, req.user!.id);
  }
}
