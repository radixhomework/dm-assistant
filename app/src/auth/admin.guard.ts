import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthedRequest } from "./auth.guard.js";

/** Restricts a route to accounts with the admin role. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (request.user?.role !== "admin") {
      throw new ForbiddenException("Administrator role required");
    }
    return true;
  }
}
