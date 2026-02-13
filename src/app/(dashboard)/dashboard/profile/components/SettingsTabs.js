"use client";

import { cn } from "@/shared/utils/cn";
import { useI18n } from "@/shared/i18n";

const TABS = [
  { id: "general", icon: "tune" },
  { id: "security", icon: "shield" },
  { id: "proxy", icon: "vpn_lock" },
  { id: "appearance", icon: "palette" },
  { id: "advanced", icon: "settings_suggest" },
];

export default function SettingsTabs({ activeTab, onTabChange }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg mb-6 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
            activeTab === tab.id
              ? "bg-white dark:bg-white/10 text-text-main shadow-sm"
              : "text-text-muted hover:text-text-main"
          )}
        >
          <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
          {t(`settings.tabs.${tab.id}`)}
        </button>
      ))}
    </div>
  );
}
