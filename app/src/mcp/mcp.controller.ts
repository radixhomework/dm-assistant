import { Controller, All, Logger, Req, Res } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";

/**
 * MCP mount (ARCHITECTURE.md §7): Streamable HTTP, stateless, Bearer token
 * required in the final design — P0 wires the transport with an EMPTY tool
 * list (no direct-write tool will ever exist: double lock). Auth arrives
 * with the identity phase; nothing is exposed before then.
 */
@Controller()
export class McpController {
  private readonly logger = new Logger(McpController.name);

  @All("/mcp")
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.debug(`MCP ${req.method} request`);

    const server = new McpServer({ name: "dm-assistant", version: "0.0.0" });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — ARCHITECTURE.md §2
      enableJsonResponse: true,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
