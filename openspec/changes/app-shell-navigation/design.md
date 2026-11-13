## Context

The shell (`app-web/src/layout/RootLayout.tsx`) is a sticky dark header (world-name brand, primary nav, account link) above the routed page. The Lore page already models the data and presentation the sidebar needs: `GET /api/records?perimeter=world`, categories in template order (`worldTemplates`), collapsed-by-default sections with icons and `lore.categories.*` labels. Tailwind v4 tokens from the RadixHomeWork theme are authoritative (ARCHITECTURE.md §3); UI is tablet-first (PRE-SPEC).

## Goals / Non-Goals

**Goals:**
- One sidebar component owned by the shell, visible on every authenticated route, reading AND editing views included.
- Reuse the records query cache shared with the Lore page (no second fetch per navigation).
- Responsive collapse below the tablet breakpoint with a header toggle.

**Non-Goals:**
- No search, filter or lazy-loading in the sidebar (one world, small record counts — the existing flat list suffices).
- No persistence of expanded categories (session-only, per spec).
- No changes to the Lore/Campaigns pages' own listings, no restructure of routes.

## Decisions

1. **Shell grid: `aside` + routed `main` in `RootLayout`** — the layout switches to a two-column grid (`md:grid-cols-[sidebar_main]`, single column stacking below). The sidebar is a sibling of the routed content, not part of it, so it survives navigation and edit-mode entry with zero route plumbing. Alternative considered: per-page inclusion — rejected, duplication and drift.
2. **One `AppSidebar` component, `useState` inside for expansion** — the expanded-category set is local state seeded collapsed (spec: session preference). Mirrors the Lore page's pattern; no global state for a viewing preference.
3. **Shared query cache** — the sidebar consumes the same `["lore-records"]` react-query key as the Lore page (`GET /api/records?perimeter=world`): first navigation fetches once, later routes hit the cache. Records render grouped by type in `worldTemplates` order; empty categories render as headers (consistent affordance) while the Lore page hides them.
4. **Highlight from the router** — active slug read from the matched record route (`useParams`/`useLocation`), highlighting the record link and its category header; works identically over the `?edit=true` search since it keys on the slug param.
5. **Narrow screens: overlay drawer, header toggle** — below `md` the sidebar renders `fixed` and hidden; the header gains a toggle button (icon + i18n label) that overlays it until dismissed (route change also dismisses). Above `md` it is static and the toggle is hidden. No third-party drawer library for one breakpoint.
6. **Visual design through the impeccable skills** — the sidebar's spacing, hover/active states and collapse control are shaped during implementation with `.agents/skills/impeccable/`, within the inherited theme tokens (AGENTS.md §5).

## Risks / Trade-offs

- [Sidebar steals width from the sheet on mid screens] → below `lg` the sidebar stays collapsed-width (categories only expand over content in a narrow column); measured during the impeccable pass rather than pre-emptively engineered.
- [Duplicate markup drift with Lore categories] → icons/labels come from the same `worldTemplates` + `lore.categories.*` sources; if drift becomes real, extract the shared category metadata module then.
- [Unsaved-edits loss on sidebar navigation] → accepted per spec (same as any in-app link today); the edit form's Cancel affordance stays the safety net until versions (phase 7) soften it.

## Migration Plan

Frontend-only, additive: no API, no schema, no route change. Rollback is reverting the commit. The `md` breakpoint choice is revisitable during the impeccable pass without spec impact.

## Open Questions

None blocking.
