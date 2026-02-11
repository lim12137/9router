"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PropTypes from "prop-types";
import { ThemeToggle, LanguageSwitcher } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";

const getPageInfo = (pathname, t) => {
  if (!pathname) return { title: "", description: "", breadcrumbs: [] };

  // Provider detail page: /dashboard/providers/[id]
  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo = OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) {
      return {
        title: providerInfo.name,
        description: "",
        breadcrumbs: [
          { label: t("nav.providers"), href: "/dashboard/providers" },
          { label: providerInfo.name, image: `/providers/${providerInfo.id}.png` }
        ]
      };
    }
  }

  if (pathname.includes("/providers")) return { title: t("nav.providers"), description: t("providers.description"), breadcrumbs: [] };
  if (pathname.includes("/combos")) return { title: t("nav.combos"), description: t("combos.description"), breadcrumbs: [] };
  if (pathname.includes("/usage")) return { title: t("nav.usage"), description: t("usage.description"), breadcrumbs: [] };
  if (pathname.includes("/cli-tools")) return { title: t("nav.cliTools"), description: t("cliTools.description"), breadcrumbs: [] };
  if (pathname.includes("/endpoint")) return { title: t("endpoint.title"), description: t("endpoint.description"), breadcrumbs: [] };
  if (pathname.includes("/profile")) return { title: t("nav.settings"), description: t("settings.description"), breadcrumbs: [] };
  if (pathname === "/dashboard") return { title: t("endpoint.title"), description: t("endpoint.description"), breadcrumbs: [] };
  return { title: "", description: "", breadcrumbs: [] };
};

export default function Header({ onMenuClick, showMenuButton = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { title, description, breadcrumbs } = getPageInfo(pathname, t);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-black/5 dark:border-white/5 bg-bg/80 backdrop-blur-xl z-10 sticky top-0">
      {/* Mobile menu button */}
      <div className="flex items-center gap-3 lg:hidden">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="text-text-main hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
      </div>

      {/* Page title with breadcrumbs - desktop */}
      <div className="hidden lg:flex flex-col">
        {breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${crumb.href || "current"}`} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="material-symbols-outlined text-text-muted text-base">
                    chevron_right
                  </span>
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-text-muted hover:text-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    {crumb.image && (
                      <Image
                        src={crumb.image}
                        alt={crumb.label}
                        width={28}
                        height={28}
                        className="object-contain rounded max-w-[28px] max-h-[28px]"
                        sizes="28px"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <h1 className="text-2xl font-semibold text-text-main tracking-tight">
                      {crumb.label}
                    </h1>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : title ? (
          <div>
            <h1 className="text-2xl font-semibold text-text-main tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-text-muted">{description}</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
          title={t("nav.logout")}
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  showMenuButton: PropTypes.bool,
};

