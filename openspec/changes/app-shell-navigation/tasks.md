## 1. Sidebar component

- [x] 1.1 `AppSidebar` component: categories from `worldTemplates` + `lore.categories.*` labels and Lore icons, collapsed by default, expand/collapse on activation, records grouped by type as router links (shared `["lore-records"]` query); component test: categories start collapsed, expansion reveals records, links navigate
- [x] 1.2 Current-location highlight: record link + category header highlighted from the active slug (works on `?edit=true` too); test asserts the highlight follows the route

## 2. Shell integration

- [x] 2.1 `RootLayout` two-column shell: static `aside` + routed `main` at and above the tablet breakpoint; sidebar visible on record reading AND editing views; `RootLayout` test updated
- [x] 2.2 Narrow-screen drawer: below the tablet breakpoint the sidebar is hidden with a header toggle overlaying it, dismissed on toggle or route change; test covers the toggle visibility per viewport class
- [x] 2.3 Visual pass through the impeccable skills: spacing, hover/active states, collapse control within the RadixHomeWork tokens; browser check on record read + edit views

## 3. i18n and quality

- [x] 3.1 Labels in fr+en (sidebar toggle aria-label, any new string); parity test green
- [x] 3.2 Full verification: typecheck, lint, unit tests, Sonar gate OK; app rebuilt and served via Docker in WSL; DM browser review of the sidebar on Lore, a record in reading and in editing
