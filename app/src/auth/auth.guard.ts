import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { SafeUser } from "../users/users.service.js";
import { UsersService } from "../users/users.service.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";

export type AuthedRequest = Request & { user?: SafeUser };

/**
 * Session-based global guard: resolves the user from the session and
 * rejects unauthenticated or blocked accounts unless the route is @Public().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const userId: unknown = request.session?.userId;
    if (typeof userId !== "string") {
      throw new UnauthorizedException();
    }
    const row = await this.usersService.findById(userId);
    if (!row || row.status === "blocked") {
      throw new UnauthorizedException();
    }
    request.user = this.usersService.safeOf(row);
    return true;
  }
}
