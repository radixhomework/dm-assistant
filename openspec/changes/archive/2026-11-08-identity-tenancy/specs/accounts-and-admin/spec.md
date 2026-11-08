## Purpose

Governs identity and instance administration: the first-startup wizard that boots the administrator and the world, session-cookie authentication, administrator-only user creation, account blocking, the admin panel, instance settings, and the P1 access rule on the single world.

## ADDED Requirements

### Requirement: First-startup wizard
When the instance has no account, the application SHALL present a setup flow at `/setup` that creates the administrator account and the world (name, content language seeded from `AUTHORING_LOCALE`). Once an account exists, `/setup` SHALL redirect to the login page.

#### Scenario: Bootstrapping a fresh instance
- **WHEN** a visitor opens the application on an instance with zero accounts and completes the setup flow
- **THEN** an administrator account and the world are created, and the visitor lands on the login page

#### Scenario: Setup closed once bootstrapped
- **WHEN** any visitor requests `/setup` while at least one account exists
- **THEN** they are redirected to the login page

### Requirement: Session authentication
The application SHALL authenticate users with email and password, verify passwords with argon2id, and maintain sessions through an `httpOnly` cookie with `SameSite=Strict`. Login SHALL be rate-limited. Logout SHALL terminate the session.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** a session cookie is issued and the user reaches the application

#### Scenario: Wrong password rejected
- **WHEN** a user submits an existing email with a wrong password
- **THEN** login fails without revealing whether the email exists, and repeated attempts are rate-limited

#### Scenario: Logout
- **WHEN** an authenticated user logs out
- **THEN** the session is terminated and the cookie is invalidated

### Requirement: Administrator-only user creation
Accounts SHALL be created exclusively by an administrator from the admin panel — the application SHALL NOT expose self-service registration. Every new account SHALL be created with role `dm` and status `active`, unless the administrator chooses another role.

#### Scenario: Admin creates a user
- **WHEN** an administrator creates a user from the admin panel with an unused email
- **THEN** a `dm` account with status `active` is created and can log in

#### Scenario: No signup path
- **WHEN** a visitor views the login page
- **THEN** no self-service registration is offered

### Requirement: Account blocking
An administrator SHALL be able to block and unblock any account. A blocked account SHALL not be able to log in, and its existing sessions SHALL be terminated. Its content and contributions remain intact.

#### Scenario: Blocked account cannot log in
- **WHEN** an administrator blocks an account and that account attempts to log in
- **THEN** login is refused with a clear message

#### Scenario: Existing sessions terminated
- **WHEN** an administrator blocks an account that has live sessions
- **THEN** those sessions no longer grant access

### Requirement: Admin panel
Users with role `admin` SHALL access an admin panel to create users and block or unblock accounts. Users with role `dm` SHALL be denied administrative endpoints and pages.

#### Scenario: Admin manages users
- **WHEN** an administrator creates a user or blocks an account from the admin panel
- **THEN** the change takes effect immediately

#### Scenario: DM denied administration
- **WHEN** a `dm` account requests an administrative endpoint or page
- **THEN** access is denied

### Requirement: Instance settings administration
The admin panel SHALL allow editing the instance settings persisted in `settings`: content language (`en` or `fr`), distance unit and weight unit. Changing the content language SHALL NOT recalculate any stored values.

#### Scenario: Editing instance settings
- **WHEN** an administrator changes the content language or the units
- **THEN** the values are persisted in `settings` and applied to the application

### Requirement: P1 access rule
Every authenticated account SHALL have full read and write access to the world's records and settings-visible features; unauthenticated requests to protected pages and API resources SHALL be rejected. Fine-grained sharing is out of scope for this capability.

#### Scenario: Authenticated full access
- **WHEN** any authenticated account (admin or dm) requests records or uses the application
- **THEN** access is granted with full read and write

#### Scenario: Unauthenticated rejected
- **WHEN** an unauthenticated visitor requests a protected page or API resource
- **THEN** they are redirected to the login page or receive an authentication error
