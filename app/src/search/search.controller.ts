import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service.js";

@Controller("api/search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /** Auth comes from the global session guard — no public route here. */
  @Get()
  search(
    @Query("q") q?: string,
    @Query("type") type?: string,
    @Query("tag") tag?: string,
  ) {
    return this.searchService.search({ q: q ?? "", type, tag });
  }
}
