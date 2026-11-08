import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import type { Env } from "@dm/schemas";
import { ENV } from "./config/env.js";
import { AuthGuardProvider } from "./auth/auth.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./api/health.controller.js";
import { DatabaseModule } from "./database/database.module.js";
import { McpModule } from "./mcp/mcp.module.js";
import { UsersModule } from "./users/users.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { EntitiesModule } from "./entities/entities.module.js";
import { RelationshipsModule } from "./relationships/relationships.module.js";
import { CalendarModule } from "./calendar/calendar.module.js";
import { MentionsModule } from "./mentions/mentions.module.js";
import { ProposalsModule } from "./proposals/proposals.module.js";
import { AnnotationsModule } from "./annotations/annotations.module.js";
import { ExternalRefsModule } from "./external-refs/external-refs.module.js";
import { AssetsModule } from "./assets/assets.module.js";
import { AuditModule } from "./audit/audit.module.js";

/**
 * Modulith root (ARCHITECTURE.md §4): one process serves the API (/api),
 * the MCP mount (/mcp) and the built PWA shell — a single door.
 * The static shell is wired in main.ts (express middleware).
 */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      global: true,
      module: AppModule,
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        SettingsModule,
        EntitiesModule,
        RelationshipsModule,
        McpModule,
        CalendarModule,
        MentionsModule,
        ProposalsModule,
        AnnotationsModule,
        ExternalRefsModule,
        AssetsModule,
        AuditModule,
      ],
      controllers: [HealthController],
      providers: [
        { provide: ENV, useValue: env },
        AuthGuardProvider,
      ],
      exports: [ENV],
    };
  }
}
