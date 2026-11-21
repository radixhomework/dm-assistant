import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Shield, Swords, UserRound, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "./useRequireAuth.js";

type Tile = {
  readonly to: string;
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly adminOnly?: boolean;
};

/**
 * Post-login launcher (DM request): the main sections as tiles with a
 * short description. The Admin tile shows for admins only. No sidebar —
 * the page is a plain launcher, like Admin and Account.
 */
export function HomePage() {
  const { t } = useTranslation();
  const { ready, user } = useRequireAuth();
  if (!ready) return null;

  const tiles: Tile[] = [
    {
      to: "/lore",
      icon: BookOpen,
      titleKey: "nav.lore",
      descriptionKey: "home.lore",
    },
    {
      to: "/calendar",
      icon: CalendarDays,
      titleKey: "nav.calendar",
      descriptionKey: "home.calendar",
    },
    {
      to: "/campaigns",
      icon: Swords,
      titleKey: "nav.campaigns",
      descriptionKey: "home.campaigns",
    },
    {
      to: "/admin",
      icon: Shield,
      titleKey: "nav.admin",
      descriptionKey: "home.admin",
      adminOnly: true,
    },
    {
      to: "/account",
      icon: UserRound,
      titleKey: "account.title",
      descriptionKey: "home.account",
    },
  ].filter((tile) => !tile.adminOnly || user?.role === "admin");

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("home.welcome")}
      </h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group rounded-lg border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent"
          >
            <tile.icon
              className="size-6 text-accent transition-colors duration-200 group-hover:text-primary"
              aria-hidden
            />
            <h2 className="mt-3 font-display text-xl text-ink">
              {t(tile.titleKey)}
            </h2>
            <p className="mt-1 text-sm text-muted">{t(tile.descriptionKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
