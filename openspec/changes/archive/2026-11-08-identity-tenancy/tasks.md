## 1. Data model

- [x] 1.1 Add the migration set: `users` (email unique, display_name, password_hash, role admin|dm, status active|blocked), `sessions` (id, user_id, data, expires_at), `entities` (slug unique, type, perimeter, title, tags, fields JSONB, body), `relationships` (from_id, to_id, kind) with the partial unique index on parent roles; verify `npm run db:migrate -w app` applies cleanly to an empty database
- [x] 1.2 Add `packages/schemas` Zod schemas: `authSchemas` (signup, login, wizard), `entitySchemas` (create/update with slug pattern), `settingsSchemas` (content language, units, registration_open); verify unit tests cover valid and invalid payloads

## 2. Identity backend

- [x] 2.1 Implement the users service (create, block/unblock, list, findByEmail) with argon2id hashing via `@node-rs/argon2`; verify unit tests cover creation and role/status defaults
- [x] 2.2 Implement the session store over the `sessions` table (get/set/destroy, expired-row cleanup) and wire `express-session` with `httpOnly`/`SameSite=Strict` cookies; verify a store unit test covers set/get/destroy round-trip
- [x] 2.3 Implement the auth module: `POST /api/auth/login` (rate-limited), `POST /api/auth/logout`, `GET /api/me`; verify unit tests cover success, wrong password, blocked account and rate-limit configuration
- [x] 2.4 Implement the wizard endpoint `POST /api/bootstrap` (creates admin + world settings atomically, refused once an account exists) and `GET /api/bootstrap` (unauthenticated instance state); verify unit tests cover first-boot creation and the refusal on second call
- [x] 2.5 Implement the admin guard (role `admin`) and the settings service (read/update content language and units, registration toggle); verify unit tests cover admin-allowed and dm-denied paths

## 3. Records backend

- [x] 3.1 Implement the entities service + CRUD controller (create/read/list/update/delete) with slug immutability, unique-slug enforcement and parent-deletion refusal; verify unit tests cover create, duplicate slug, slug change refusal, update and parent-deletion refusal
- [x] 3.2 Implement hierarchy endpoints (attach/detach parent with kinds `chapter`/`scene`, single-parent enforcement, children listing); verify unit tests cover attach, single-parent refusal, children listing and detach
- [x] 3.3 Implement play tracking: status field on Scene records and the aggregation service folding child statuses upward (empty = not played); verify unit tests cover all three states and the mixed-children fold
- [x] 3.4 Enforce authentication on all records and admin routes (guard wiring) and verify anonymous requests receive authentication errors

## 4. Frontend

- [x] 4.1 Build the setup wizard page (`/setup`, gated by `GET /api/bootstrap`) and the login page; both themed and fully labeled in `fr` + `en`; verify the wizard creates the admin and lands on login
- [x] 4.2 Build the three-section navigation (Lore, Campaigns, Admin) with the Lore section (world records grouped by template type, create/edit generic records) and the campaign view (`/campaigns`: campaign list + hierarchy and tracking badges); verify creating a record and a campaign with chapters and scenes works end to end
- [x] 4.3 Build the admin panel (`/admin`: users table with block/unblock, create user, instance settings form); verify admin actions take effect and dm accounts cannot reach the page
- [x] 4.4 Add auth-aware routing (redirect to `/login` when unauthenticated, redirect `/setup` when bootstrapped) and extend the i18n catalogs; verify the parity test passes and all routes are labeled in both languages

## 5. Quality gate

- [x] 5.1 Run the impeccable design pass over the new pages (wizard, login, dashboard, campaign view, admin) and apply material fixes; verify the theme holds in both languages
- [x] 5.2 Verify the P1 exit criterion end to end: from a clean compose stack, the wizard bootstraps, the admin logs in, creates a campaign with chapters and scenes, sets scene statuses and the tracking aggregates upward
- [x] 5.3 Confirm CI + Sonar gate pass on the pull request (coverage ≥ 80% on new code) and mark the phase done
