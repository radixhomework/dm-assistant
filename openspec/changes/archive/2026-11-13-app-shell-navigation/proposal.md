## Why

Editing or reading a record is a dead end: reaching another record always means going back to the Lore page and re-expanding a category. As the phases remaining in records-editor (calendar, reference controls, bespoke sheets) each get reviewed record by record, this round-trip multiplies — and the DM asked for the categories/records list to stay visible next to the sheet being worked on.

## What Changes

- A persistent left sidebar in the application shell: record categories (by template, collapsed by default, same icons and labels as the Lore page) expanding to the records of that category as links.
- The sidebar is visible on every authenticated page — reading and editing views included — with the current record highlighted; activating a link navigates without leaving the work context.
- Responsive behavior: below the tablet breakpoint the sidebar collapses (toggle button brings it back).
- The Lore and Campaigns pages keep their full listings; the sidebar is navigation, not a replacement.
- The top header (world name, primary navigation, account) stays unchanged.

## Capabilities

### New Capabilities
- `app-shell-navigation`: persistent left sidebar navigation of the authenticated shell — categories by template, record links, current-record highlight, responsive collapse; interaction rules with the existing header and list pages.

### Modified Capabilities
<!-- none: the header, pages and records behavior are untouched at requirement level -->

## Impact

- `app-web/src/layout/RootLayout.tsx` (shell layout gains the sidebar column), new sidebar component + queries (records list already served by `GET /api/records`).
- `app-web/src/styles.css` (layout grid/breakpoints), `app-web/src/i18n/en.json` + `fr.json` (labels, both languages).
- No backend change; no schema change.
- UI work goes through the impeccable skills (AGENTS.md §5); the RadixHomeWork theme tokens stay authoritative.
