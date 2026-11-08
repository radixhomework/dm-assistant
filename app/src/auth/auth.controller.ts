import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
  wizardSchema,
} from "@dm/schemas";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";
import type { AuthedRequest } from "./auth.guard.js";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    const { email, password } = loginSchema.parse(body);
    const user = await this.authService.login(email, password, req.session);
    return { id: user.id, email: user.email, role: user.role };
  }

  @HttpCode(204)
  @Post("logout")
  logout(@Req() req: Request, @Res() res: Response): void {
    req.session.destroy(() => {
      res.clearCookie("dm.sid");
      res.status(204).send();
    });
  }

  @Get("me")
  me(@Req() req: AuthedRequest) {
    return req.user;
  }

  @Patch("me")
  updateProfile(@Req() req: AuthedRequest, @Body() body: unknown) {
    const input = updateProfileSchema.parse(body);
    return this.authService.updateProfile(req.user!.id, input);
  }

  @HttpCode(204)
  @Post("me/password")
  async changePassword(@Req() req: AuthedRequest, @Body() body: unknown) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);
    await this.authService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
    );
  }
}

@Controller("api/bootstrap")
export class BootstrapController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get()
  async state() {
    return {
      adminExists: await this.authService.adminExists(),
    };
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async bootstrap(@Body() body: unknown) {
    const input = wizardSchema.parse(body);
    return this.authService.bootstrapInstance(input);
  }
}
