import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController, BootstrapController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { SessionStore } from "./session.store.js";

@Module({
  controllers: [AuthController, BootstrapController],
  providers: [AuthService, SessionStore, AuthGuard],
  exports: [SessionStore],
})
export class AuthModule {}

/** Global session guard wiring (see app.module.ts). */
export const AuthGuardProvider = {
  provide: APP_GUARD,
  useClass: AuthGuard,
};
