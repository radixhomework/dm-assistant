import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service.js";

/**
 * Express parses repeated query keys (`?q=a&q=b`) as arrays: forwarding
 * one to the service would throw deep inside (`q.trim()`), surfacing a
 * 500 instead of a client error — reject with a stable code instead
 * (CodeRabbit round-1 review).
 */
function textParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined || typeof value === "string") return value;
  throw new BadRequestException({ code: "invalid_query", message: "invalid_query" });
}

@Controller("api/search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** Auth comes from the global session guard — no public route here. */
  @Get()
  search(
    @Query("q") q?: string | string[],
    @Query("type") type?: string | string[],
    @Query("tag") tag?: string | string[],
  ) {
    return this.searchService.search({
      q: textParam(q) ?? "",
      type: textParam(type),
      tag: textParam(tag),
    });
  }
}
