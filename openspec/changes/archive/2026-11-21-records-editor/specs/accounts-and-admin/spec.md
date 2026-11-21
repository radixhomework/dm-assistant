## ADDED Requirements

### Requirement: Instance settings with the world name
The admin panel SHALL offer the instance settings with the **world name** as their first entry: a required text value (1–80 characters) persisted through the settings endpoint. Renaming the world SHALL take effect immediately — the application header and the tab title re-brand from the persisted name without a restart. The world name is instance-wide branding only: it is never part of record data.

#### Scenario: Admin renames the world
- **WHEN** an administrator sets a new world name in the admin panel's settings and saves
- **THEN** the name is persisted and the application header re-brands with the new name

#### Scenario: The world name is required
- **WHEN** the settings are saved without a world name (empty value)
- **THEN** the save is refused by validation
