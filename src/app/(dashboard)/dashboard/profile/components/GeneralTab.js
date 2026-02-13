"use client";

import PropTypes from "prop-types";
import { Card, Toggle, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import { useTheme } from "@/shared/hooks/useTheme";

export default function GeneralTab({
  settings,
  loading,
  onUpdateFallbackStrategy,
  onUpdateStickyLimit,
}) {
  const { t } = useI18n();
  const { isDark, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
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
          <p className="text-sm text-text-muted" dangerouslySetInnerHTML={{ __html: t("endpoint.dataStoredLocally", { path: "<code class=\"bg-sidebar px-1 rounded\">~/.9router/db.json</code>" }) }}></p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <span className="material-symbols-outlined text-[20px]">route</span>
          </div>
          <h3 className="text-lg font-semibold">{t("settings.routing")}</h3>
        </div>
        <div className="flex flex-col gap-4">
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

          {settings.fallbackStrategy === "round-robin" && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div>
                <p className="font-medium">{t("settings.stickyLimit")}</p>
                <p className="text-sm text-text-muted">{t("settings.stickyLimitDesc")}</p>
              </div>
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.stickyRoundRobinLimit || 3}
                onChange={(e) => onUpdateStickyLimit(e.target.value)}
                disabled={loading}
                className="w-20 text-center"
              />
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
            <span className="material-symbols-outlined text-[20px]">database</span>
          </div>
          <h3 className="text-lg font-semibold">{t("settings.data")}</h3>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border">
          <div>
            <p className="font-medium">{t("settings.databaseLocation")}</p>
            <p className="text-sm text-text-muted font-mono">{t("settings.databasePath")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

GeneralTab.propTypes = {
  settings: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  onUpdateFallbackStrategy: PropTypes.func.isRequired,
  onUpdateStickyLimit: PropTypes.func.isRequired,
};
