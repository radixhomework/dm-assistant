## MODIFIED Requirements

### Requirement: Admin panel
Users with role `admin` SHALL access an admin panel organized into tabs — **Users**, **Instance**, **Calendar**, **Import catalogs**, **External references** and **Tags** — relocating the existing user management, instance settings and calendar editor into the first three tabs and hosting the new import, external-references and tags surfaces in the others. Administrators create users and block or unblock accounts from the Users tab. Users with role `dm` SHALL be denied administrative endpoints and pages.

#### Scenario: Admin manages users
- **WHEN** an administrator creates a user or blocks an account from the admin panel
- **THEN** the change takes effect immediately

#### Scenario: DM denied administration
- **WHEN** a `dm` account requests an administrative endpoint or page
- **THEN** access is denied

#### Scenario: Tabs organize the panel
- **WHEN** an administrator opens the admin panel
- **THEN** the six tabs are present — Users, Instance, Calendar, Import catalogs, External references, Tags — and each opens its surface without leaving the admin route
