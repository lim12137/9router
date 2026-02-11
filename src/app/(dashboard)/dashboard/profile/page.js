"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Toggle, Input } from "@/shared/components";
import { useTheme } from "@/shared/hooks/useTheme";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";

export default function ProfilePage() {
  const { theme, setTheme, isDark } = useTheme();
  const { t } = useI18n();
  const [settings, setSettings] = useState({ fallbackStrategy: "fill-first" });
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [passLoading, setPassLoading] = useState(false);

  // Proxy settings state
  const [proxySettings, setProxySettings] = useState({
    httpProxy: "",
    httpsProxy: "",
    allProxy: "",
    noProxy: "",
  });
  const [proxyTestStatus, setProxyTestStatus] = useState({ type: "", message: "" });
  const [proxyTestLoading, setProxyTestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setProxySettings({
          httpProxy: data.httpProxy || "",
          httpsProxy: data.httpsProxy || "",
          allProxy: data.allProxy || "",
          noProxy: data.noProxy || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch settings:", err);
        setLoading(false);
      });
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassStatus({ type: "error", message: t("settings.passwordMatch") });
      return;
    }

    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPassStatus({ type: "success", message: t("settings.passwordUpdated") });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setPassStatus({ type: "error", message: data.error || t("settings.passwordUpdateFailed") });
      }
    } catch (err) {
      setPassStatus({ type: "error", message: t("errors.unknownError") });
    } finally {
      setPassLoading(false);
    }
  };

  const updateFallbackStrategy = async (strategy) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fallbackStrategy: strategy }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, fallbackStrategy: strategy }));
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const updateStickyLimit = async (limit) => {
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickyRoundRobinLimit: numLimit }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, stickyRoundRobinLimit: numLimit }));
      }
    } catch (err) {
      console.error("Failed to update sticky limit:", err);
    }
  };

  const updateRequireLogin = async (requireLogin) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireLogin }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, requireLogin }));
      }
    } catch (err) {
      console.error("Failed to update require login:", err);
    }
  };

  const updateObservabilitySetting = async (key, value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: numValue }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: numValue }));
      }
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
    }
  };

  // Update proxy settings
  const updateProxySetting = async (key, value) => {
    setProxySettings(prev => ({ ...prev, [key]: value }));

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        throw new Error("Failed to update proxy setting");
      }
    } catch (err) {
      console.error("Failed to update proxy setting:", err);
    }
  };

  // Test proxy connection
  const testProxy = async () => {
    setProxyTestLoading(true);
    setProxyTestStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxySettings),
      });

      const data = await res.json();

      if (data.success) {
        setProxyTestStatus({ type: "success", message: t("settings.proxyTestSuccess") });
      } else {
        setProxyTestStatus({ type: "error", message: t("settings.proxyTestFailed", { error: data.error }) });
      }
    } catch (err) {
      setProxyTestStatus({ type: "error", message: t("settings.proxyTestFailed", { error: err.message }) });
    } finally {
      setProxyTestLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
            <p className="text-sm text-text-muted" dangerouslySetInnerHTML={{ __html: t("endpoint.dataStoredLocally", { path: "<code class=\"bg-sidebar px-1 rounded\">~/.9router/db.json</code>" }) }}></p>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </div>
            <h3 className="text-lg font-semibold">{t("settings.security")}</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.requireLogin")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.requireLoginDesc")}
                </p>
              </div>
              <Toggle
                checked={settings.requireLogin === true}
                onChange={() => updateRequireLogin(!settings.requireLogin)}
                disabled={loading}
              />
            </div>
            {settings.requireLogin === true && (
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 pt-4 border-t border-border/50">
                {settings.hasPassword && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">{t("settings.currentPassword")}</label>
                    <Input
                      type="password"
                      placeholder="•••••••••"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">{t("settings.newPassword")}</label>
                    <Input
                      type="password"
                      placeholder="•••••••••"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">{t("settings.confirmNewPassword")}</label>
                    <Input
                      type="password"
                      placeholder="•••••••••"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {passStatus.message && (
                  <p className={`text-sm ${passStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
                    {passStatus.message}
                  </p>
                )}

                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={passLoading}>
                    {settings.hasPassword ? t("settings.updatePassword") : t("settings.setPassword")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        {/* Routing Preferences */}
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
                <p className="text-sm text-text-muted">
                  {t("settings.roundRobinDesc")}
                </p>
              </div>
              <Toggle
                checked={settings.fallbackStrategy === "round-robin"}
                onChange={() => updateFallbackStrategy(settings.fallbackStrategy === "round-robin" ? "fill-first" : "round-robin")}
                disabled={loading}
              />
            </div>

            {/* Sticky Round Robin Limit */}
            {settings.fallbackStrategy === "round-robin" && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <p className="font-medium">{t("settings.stickyLimit")}</p>
                  <p className="text-sm text-text-muted">
                    {t("settings.stickyLimitDesc")}
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.stickyRoundRobinLimit || 3}
                  onChange={(e) => updateStickyLimit(e.target.value)}
                  disabled={loading}
                  className="w-20 text-center"
                />
              </div>
            )}

            <p className="text-xs text-text-muted italic pt-2 border-t border-border/50">
              {settings.fallbackStrategy === "round-robin"
                ? `${t("settings.fillFirstDesc")} - ${settings.stickyRoundRobinLimit || 3} ${t("settings.stickyLimitDesc")}`
                : t("settings.fillFirstDesc")}
            </p>
          </div>
        </Card>

        {/* Proxy Settings (NEW) */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <span className="material-symbols-outlined text-[20px]">vpn_lock</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("settings.proxy")}</h3>
              <p className="text-sm text-text-muted">{t("settings.proxyDesc")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {/* All Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.allProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.allProxyPlaceholder")}
                value={proxySettings.allProxy}
                onChange={(e) => updateProxySetting("allProxy", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* HTTP Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.httpProxyPlaceholder")}
                value={proxySettings.httpProxy}
                onChange={(e) => updateProxySetting("httpProxy", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* HTTPS Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpsProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.httpsProxyPlaceholder")}
                value={proxySettings.httpsProxy}
                onChange={(e) => updateProxySetting("httpsProxy", e.target.value)}
                disabled={loading}
              />
            </div>

            {/* No Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.noProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.noProxyPlaceholder")}
                value={proxySettings.noProxy}
                onChange={(e) => updateProxySetting("noProxy", e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-text-muted">{t("settings.noProxyDesc")}</p>
            </div>

            {/* Test Button */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-xs text-text-muted">
                {(proxySettings.allProxy || proxySettings.httpProxy || proxySettings.httpsProxy)
                  ? t("settings.proxyEnabled")
                  : t("settings.proxyDisabled")}
              </p>
              <Button
                variant="secondary"
                onClick={testProxy}
                loading={proxyTestLoading}
                disabled={!proxySettings.allProxy && !proxySettings.httpProxy && !proxySettings.httpsProxy}
              >
                <span className="material-symbols-outlined text-[18px] mr-1">network_check</span>
                {t("settings.testProxy")}
              </Button>
            </div>

            {/* Test Status */}
            {proxyTestStatus.message && (
              <p className={`text-sm ${proxyTestStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
                {proxyTestStatus.message}
              </p>
            )}
          </div>
        </Card>

        {/* Theme Preferences */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <span className="material-symbols-outlined text-[20px]">palette</span>
            </div>
            <h3 className="text-lg font-semibold">{t("settings.appearance")}</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.darkMode")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.darkModeDesc")}
                </p>
              </div>
              <Toggle
                checked={isDark}
                onChange={() => setTheme(isDark ? "light" : "dark")}
              />
            </div>

            {/* Theme Options */}
            <div className="pt-4 border-t border-border">
              <div className="inline-flex p-1 rounded-lg bg-black/5 dark:bg-white/5">
                {["light", "dark", "system"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTheme(option)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all",
                      theme === option
                        ? "bg-white dark:bg-white/10 text-text-main shadow-sm"
                        : "text-text-muted hover:text-text-main"
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {option === "light" ? "light_mode" : option === "dark" ? "dark_mode" : "contrast"}
                    </span>
                    <span className="capitalize">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <span className="material-symbols-outlined text-[20px]">database</span>
            </div>
            <h3 className="text-lg font-semibold">{t("settings.data")}</h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-bg border border-border">
              <div>
                <p className="font-medium">{t("settings.databaseLocation")}</p>
                <p className="text-sm text-text-muted font-mono">{t("settings.databasePath")}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Observability Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <span className="material-symbols-outlined text-[20px]">monitoring</span>
            </div>
            <h3 className="text-lg font-semibold">{t("settings.observability")}</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.maxRecords")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.maxRecordsDesc")}
                </p>
              </div>
              <Input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={settings.observabilityMaxRecords || 1000}
                onChange={(e) => updateObservabilitySetting("observabilityMaxRecords", parseInt(e.target.value))}
                disabled={loading}
                className="w-28 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.batchSize")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.batchSizeDesc")}
                </p>
              </div>
              <Input
                type="number"
                min="5"
                max="100"
                step="5"
                value={settings.observabilityBatchSize || 20}
                onChange={(e) => updateObservabilitySetting("observabilityBatchSize", parseInt(e.target.value))}
                disabled={loading}
                className="w-28 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.flushInterval")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.flushIntervalDesc")}
                </p>
              </div>
              <Input
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={settings.observabilityFlushIntervalMs || 5000}
                onChange={(e) => updateObservabilitySetting("observabilityFlushIntervalMs", parseInt(e.target.value))}
                disabled={loading}
                className="w-28 text-center"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.maxJsonSize")}</p>
                <p className="text-sm text-text-muted">
                  {t("settings.maxJsonSizeDesc")}
                </p>
              </div>
              <Input
                type="number"
                min="100"
                max="10240"
                step="100"
                value={settings.observabilityMaxJsonSize || 1024}
                onChange={(e) => updateObservabilitySetting("observabilityMaxJsonSize", parseInt(e.target.value))}
                disabled={loading}
                className="w-28 text-center"
              />
            </div>

            <p className="text-xs text-text-muted italic pt-2 border-t border-border/50">
              {t("settings.maxRecords")} {settings.observabilityMaxRecords || 1000}, {t("settings.batchSize")} {settings.observabilityBatchSize || 20}, {t("settings.maxJsonSize")} {settings.observabilityMaxJsonSize || 1024}KB
            </p>
          </div>
        </Card>

        {/* App Info */}
        <div className="text-center text-sm text-text-muted py-4">
          <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          <p className="mt-1">{t("endpoint.runningOnMachine")} - {t("endpoint.dataStoredLocally", { path: "" })}</p>
        </div>
      </div>
    </div>
  );
}
