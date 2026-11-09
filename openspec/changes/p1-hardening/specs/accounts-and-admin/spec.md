## MODIFIED Requirements

### Requirement: First-startup wizard
When the instance has no account, the application SHALL present a setup flow at `/setup` that creates the administrator account and the world (name, content language seeded from `AUTHORING_LOCALE`). Until the first account exists, the application SHALL redirect every route to `/setup`. Once an account exists, `/setup` SHALL redirect to the login page.

#### Scenario: Bootstrapping a fresh instance
- **WHEN** a visitor opens the application on an instance with zero accounts and completes the setup flow
- **THEN** an administrator account and the world are created, and the visitor lands on the login page

#### Scenario: Setup closed once bootstrapped
- **WHEN** any visitor requests `/setup` while at least one account exists
- **THEN** they are redirected to the login page

#### Scenario: Fresh instance redirects to setup
- **WHEN** any visitor opens any application route on an instance with zero accounts
- **THEN** they are redirected to `/setup`

### Requirement: Session authentication
The application SHALL authenticate users with email and password, verify passwords with argon2id, and maintain sessions through an `httpOnly` cookie with `SameSite=Strict`. Login SHALL be rate-limited. Logout SHALL terminate the session. After a successful login the user SHALL reach the application with the authenticated state applied; after logout the user SHALL land on the login page.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** a session cookie is issued and the user reaches the application

#### Scenario: Wrong password rejected
- **WHEN** a user submits an existing email with a wrong password
- **THEN** login fails without revealing whether the email exists, and repeated attempts are rate-limited

#### Scenario: Logout
- **WHEN** an authenticated user logs out
- **THEN** the session is terminated, the cookie is invalidated, and the user lands on the login page

### Requirement: Instance settings administration
The admin panel SHALL allow editing the instance settings persisted in `settings`: distance unit (`m` or `ft`), weight unit (`kg` or `lb`) and volume unit (`L` or `gal`). Units SHALL be closed value lists — no free-text unit. The admin panel SHALL NOT expose a content-language control: record content is language-agnostic (written or imported in whatever language the DM uses), the per-account UI language switcher being the only language control. Changing any setting SHALL NOT recalculate any stored values. A stored unit value outside its list SHALL fall back to the list's first value at read time.

#### Scenario: Editing instance settings
- **WHEN** an administrator changes any unit through the admin selects
- **THEN** the value is persisted in `settings` and applied to the application

#### Scenario: Invalid stored unit falls back
- **WHEN** a settings row holds a unit value outside its closed list
- **THEN** the application reads the list's first value instead of failing

#### Scenario: No content-language control
- **WHEN** an administrator views the admin panel settings
- **THEN** no content-language field is offered

## ADDED Requirements

### Requirement: Per-account UI language
Every account MAY pick its UI language (`en` or `fr`), stored on the account. The choice SHALL be applied at page load for authenticated users; anonymous visitors and accounts without a choice SHALL get the instance default (`UI_LOCALE` build-time default). Changing the UI language SHALL NOT affect the world's content language.

#### Scenario: Language switch persists
- **WHEN** an authenticated user switches the UI language from the header switcher and reloads the application
- **THEN** the interface renders in the chosen language

#### Scenario: Instance default applies otherwise
- **WHEN** an anonymous visitor or an account without an explicit choice opens the application
- **THEN** the interface renders in the instance default language

### Requirement: Profile self-service
Every authenticated user SHALL edit their own email, display name and UI language, and change their own password. A password change SHALL require the current password; the new password SHALL satisfy the same strength rule as account creation (12+ characters). Email uniqueness SHALL be enforced.

#### Scenario: User updates their profile
- **WHEN** an authenticated user changes their display name or email to unused values
- **THEN** the change is persisted and reflected in the session identity

#### Scenario: Password change requires current password
- **WHEN** a user submits a password change with a wrong current password
- **THEN** the change is refused; with the correct current password and a valid new password, it succeeds and future logins use the new password

### Requirement: Admin password reset
An administrator SHALL set a new password for any account from the admin panel. The reset SHALL not require the account's current password and SHALL NOT change the account's status or role.

#### Scenario: Admin resets a password
- **WHEN** an administrator sets a new password for an account
- **THEN** the account can log in with the new password and its status and role are unchanged

### Requirement: User deletion
An administrator SHALL delete an account from the admin panel. The deletion SHALL be refused while the user created at least one campaign record, with an explicit error. An administrator SHALL NOT delete their own account. Records authored by the user that are not campaigns SHALL keep existing (their author reference is cleared).

#### Scenario: Delete a user without campaigns
- **WHEN** an administrator deletes a user who created no campaign record
- **THEN** the account and its sessions are removed and the account can no longer log in

#### Scenario: Delete refused while campaigns exist
- **WHEN** an administrator attempts to delete a user who created at least one campaign
- **THEN** the deletion is refused with an explicit error

#### Scenario: Self-deletion refused
- **WHEN** an administrator attempts to delete their own account
- **THEN** the deletion is refused
