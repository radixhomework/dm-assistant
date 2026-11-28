import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "./useRequireAuth.js";
import { UsersTab } from "../components/admin/users-tab.js";
import { InstanceTab } from "../components/admin/instance-tab.js";
import { CalendarTab } from "../components/admin/calendar-tab.js";
import { ImportCatalogsTab } from "../components/admin/import-catalogs-tab.js";
import { TagsAdminTab } from "../components/admin/tags-admin-tab.js";
import { ExternalReferencesTab } from "../components/admin/external-references-tab.js";

/** The six tabs of the admin panel (accounts-and-admin spec): Users,
 * Instance, Calendar, Import catalogs, External references, Tags —
 * client-side navigation on the admin route, admin gating unchanged. */
const TABS = [
  "users",
  "instance",
  "calendar",
  "import",
  "externalRefs",
  "tags",
] as const;
type TabId = (typeof TABS)[number];

export function AdminPage() {
  const { t } = useTranslation();
  const { ready, user } = useRequireAuth();
  const [tab, setTab] = useState<TabId>("users");

  if (!ready) return null;
  if (user?.role !== "admin") {
    return <p className="text-radish">{t("admin.title")}</p>;
  }

  const tabLabel = (id: TabId): string => t(`admin.tabs.${id}`);
  const tabButtonClass = (id: TabId): string =>
    [
      "rounded-md px-3 py-1.5 text-sm transition-colors duration-200",
      tab === id
        ? "bg-primary text-background"
        : "text-muted hover:bg-surface hover:text-ink",
    ].join(" ");

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("admin.title")}
      </h1>
      <div
        role="tablist"
        aria-label={t("admin.title")}
        className="mt-6 flex flex-wrap items-center gap-1 border-b border-border pb-3"
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tabButtonClass(id)}
          >
            {tabLabel(id)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        {tab === "users" && <UsersTab />}
        {tab === "instance" && <InstanceTab />}
        {tab === "calendar" && <CalendarTab />}
        {tab === "import" && <ImportCatalogsTab />}
        {tab === "externalRefs" && <ExternalReferencesTab />}
        {tab === "tags" && <TagsAdminTab />}
      </div>
    </div>
  );
}
