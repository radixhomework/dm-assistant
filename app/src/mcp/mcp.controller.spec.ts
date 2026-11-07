import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  transportClose: vi.fn(),
  serverClose: vi.fn(),
  handleRequest: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn(function () {
    return { connect: mocks.connect, close: mocks.serverClose };
  }),
}));
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn(function () {
    return {
      handleRequest: mocks.handleRequest,
      close: mocks.transportClose,
    };
  }),
}));

import { McpController } from "./mcp.controller.js";

function fakeReq(): Request & EventEmitter {
  const req = new EventEmitter() as unknown as Request & EventEmitter;
  req.method = "POST";
  Object.defineProperty(req, "path", { value: "/mcp" });
  (req as unknown as { body: unknown }).body = { jsonrpc: "2.0", id: 1 };
  return req;
}

function fakeRes(): Response & EventEmitter {
  const res = new EventEmitter() as unknown as Response & EventEmitter;
  res.statusCode = 200;
  return res;
}

describe("McpController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects a stateless transport and delegates the request", async () => {
    const controller = new McpController();
    const req = fakeReq();
    const res = fakeRes();

    await controller.handle(req, res);

    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.handleRequest).toHaveBeenCalledWith(req, res, {
      jsonrpc: "2.0",
      id: 1,
    });
  });

  it("closes server and transport when the response closes", async () => {
    const controller = new McpController();
    const req = fakeReq();
    const res = fakeRes();

    await controller.handle(req, res);
    res.emit("close");

    expect(mocks.transportClose).toHaveBeenCalledTimes(1);
    expect(mocks.serverClose).toHaveBeenCalledTimes(1);
  });
});
