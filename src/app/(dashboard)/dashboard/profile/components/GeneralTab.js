"use client";

import PropTypes from "prop-types";
import { Card, Toggle, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";

export default function GeneralTab({
  settings,
  loading,
  onUpdateFallbackStrategy,
  onUpdateStickyLimit,
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      {/* Local Mode Info */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-12 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">computer</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t("endpoint.localMode")}</h2>
            <p className="text-text-muted">{t("endpoint.runningOnMachine")}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-text-muted">{t("endpoint.dataStoredLocally", { path: "<code class=\\\"bg-sidebar px-1 rounded\\\">~/.9router/db.json</code>" })}</p>
        </div>
      </Card>

      {/* Routing Preferences */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">route</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("settings.routing")}</h3>
            <p className="text-sm text-text-muted">{t("settings.roundRobinDesc")}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t("settings.roundRobin")}</p>
            <p className="text-sm text-text-muted">{t("settings.roundRobinDesc")}</p>
          </div>
          <Toggle
            checked={settings.fallbackStrategy === "round-robin"}
            onChange={() => onUpdateFallbackStrategy(settings.fallbackStrategy === "round-robin" ? "fill-first" : "round-robin")}
            disabled={loading}
          />
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">database</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("settings.data")}</h3>
            <p className="text-sm text-text-muted">{t("settings.databaseLocation")}</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border">
          <div>
            <p className="font-medium">{t("settings.databasePath")}</p>
            <p className="text-sm text-text-muted font-mono">{t("settings.databasePath")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
