import { BadRequestException } from "@nestjs/common";

/**
 * Stable import error codes (the packages/schemas error-codes contract):
 * the backend never formats a human message — the client translates
 * errors.<code>.
 */

/** The dataset payload or the accepted selection is unusable. */
export class ImportInputError extends BadRequestException {
  constructor(message: string) {
    super({ code: "import_invalid_payload", message: "import_invalid_payload" });
    this.message = message;
  }
}

/** The endpoint URL is refused: non-HTTPS, unresolvable or private. */
export class UrlRefusedError extends BadRequestException {
  constructor(message: string) {
    super({ code: "import_url_refused", message: "import_url_refused" });
    this.message = message;
  }
}

/** The endpoint answered but the fetch failed (non-OK or unreadable). */
export class EndpointUnreachableError extends BadRequestException {
  constructor(message: string) {
    super({
      code: "import_endpoint_unreachable",
      message: "import_endpoint_unreachable",
    });
    this.message = message;
  }
}
