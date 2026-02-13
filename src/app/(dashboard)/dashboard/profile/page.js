"use client";

import { useState, useEffect } from "react";
import { Card, Button, Toggle, Input } from "@/shared/components";
import { useTheme } from "@/shared/hooks/useTheme";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import { AI_PROVIDERS } from "@/shared/constants/providers";

const PROXY_PROTOCOL_OPTIONS = [
  { value: "http://", label: "HTTP" },
  { value: "https://", label: "HTTPS" },
  { value: "socks5://", label: "SOCKS5" },
  { value: "socks5h://", label: "SOCKS5h" },
  { value: "socks4://", label: "SOCKS4" },
  { value: "socks4a://", label: "SOCKS4a" },
];

function normalizeProxyProtocol(protocol) {
  const lower = String(protocol || "").toLowerCase();
  if (lower === "sock5://") return "socks5://";
  if (lower === "sock://") return "socks://";
  if (lower === "sock4://") return "socks4://";
  if (lower === "sock4a://") return "socks4a://";
  return lower;
}

function splitProxyValue(rawValue) {
  const value = typeof rawValue === "string" ? rawValue : "";
  const match = value.match(/^([a-z][a-z0-9+.-]*:\/\/)(.*)$/i);
  if (!match) {
    return { hasKnownProtocol: false, protocol: "", address: value };
  }

  const normalized = normalizeProxyProtocol(match[1]);
  const hasKnownProtocol = PROXY_PROTOCOL_OPTIONS.some((item) => item.value === normalized);
  if (!hasKnownProtocol) {
    return { hasKnownProtocol: false, protocol: "", address: value };
  }

  return { hasKnownProtocol: true, protocol: normalized, address: match[2] || "" };
}

function ProxyAddressField({ t, value, onChange, placeholder, disabled }) {
  const parsed = splitProxyValue(value);
  const selectedProtocol = parsed.hasKnownProtocol ? parsed.protocol : "";
  const inputValue = parsed.hasKnownProtocol ? parsed.address : (value || "");

  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <select
        value={selectedProtocol}
        onChange={(e) => {
          const nextProtocol = e.target.value;
          const baseAddress = parsed.hasKnownProtocol ? parsed.address : (value || "");
          if (!nextProtocol) {
            onChange(baseAddress);
            return;
          }
          onChange(baseAddress ? `${nextProtocol}${baseAddress}` : `${nextProtocol}`);
        }}
        disabled={disabled}
        className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
      >
        <option value="">{t("settings.proxyProtocolManual")}</option>
        {PROXY_PROTOCOL_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          const nextValue = e.target.value;
          if (selectedProtocol) {
            onChange(nextValue ? `${selectedProtocol}${nextValue}` : "");
            return;
          }
          onChange(nextValue);
        }}
        disabled={disabled}
      />
    </div>
  );
}

function createEmptyProxyProfile() {
  const id = `proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: "",
    allProxy: "",
    httpProxy: "",
    httpsProxy: "",
    noProxy: "",
  };
}

function getProxyProfileAddress(profile) {
  return profile?.allProxy || profile?.httpsProxy || profile?.httpProxy || "";
}

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
  const [proxyProfiles, setProxyProfiles] = useState([]);
  const [providerProxyBindings, setProviderProxyBindings] = useState({});
  const [proxyProviders, setProxyProviders] = useState([]);
  const [bulkProxyProfileId, setBulkProxyProfileId] = useState("");
  const [proxySaving, setProxySaving] = useState(false);
  const [proxySaveStatus, setProxySaveStatus] = useState({ type: "", message: "" });
  const [profileTestStatus, setProfileTestStatus] = useState({});
  const [profileTestingId, setProfileTestingId] = useState("");
  const [proxyTestStatus, setProxyTestStatus] = useState({ type: "", message: "" });
  const [proxyTestLoading, setProxyTestLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((res) => res.json()),
      fetch("/api/provider-nodes").then((res) => res.json()).catch(() => ({ nodes: [] })),
    ])
      .then(([data, nodeData]) => {
        setSettings(data);
        setProxySettings({
          httpProxy: data.httpProxy || "",
          httpsProxy: data.httpsProxy || "",
          allProxy: data.allProxy || "",
          noProxy: data.noProxy || "",
        });
        setProxyProfiles(Array.isArray(data.proxyProfiles) ? data.proxyProfiles : []);
        setProviderProxyBindings(data.providerProxyBindings || {});

        const builtins = Object.values(AI_PROVIDERS).map((provider) => ({
          value: provider.id,
          label: provider.name,
        }));
        const customNodes = (Array.isArray(nodeData?.nodes) ? nodeData.nodes : []).map((node) => ({
          value: node.id,
          label: node.name || node.id,
        }));
        const fromBindings = Object.keys(data.providerProxyBindings || {})
          .filter((providerId) => providerId !== "*")
          .map((providerId) => ({
            value: providerId,
            label: providerId,
          }));

        const providerMap = new Map();
        [...builtins, ...customNodes, ...fromBindings].forEach((item) => {
          if (item?.value && !providerMap.has(item.value)) {
            providerMap.set(item.value, item);
          }
        });

        setProxyProviders(
          Array.from(providerMap.values()).sort((a, b) =>
            a.label.localeCompare(b.label, "en", { sensitivity: "base" })
          )
        );
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

  const updateProxyProfileField = (profileId, key, value) => {
    setProxyProfiles((prev) =>
      prev.map((profile) => (profile.id === profileId ? { ...profile, [key]: value } : profile))
    );
    setProxySaveStatus({ type: "", message: "" });
  };

  const addProxyProfile = () => {
    setProxyProfiles((prev) => [...prev, createEmptyProxyProfile()]);
    setProxySaveStatus({ type: "", message: "" });
  };

  const removeProxyProfile = (profileId) => {
    setProxyProfiles((prev) => prev.filter((profile) => profile.id !== profileId));
    setBulkProxyProfileId((prev) => (prev === profileId ? "" : prev));
    setProviderProxyBindings((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([providerId, boundProfileId]) => {
        if (boundProfileId === profileId) {
          delete next[providerId];
        }
      });
      return next;
    });
    setProxySaveStatus({ type: "", message: "" });
  };

  const updateProviderProxyBinding = (providerId, profileId) => {
    setProviderProxyBindings((prev) => {
      if (!profileId) {
        const next = { ...prev };
        delete next[providerId];
        return next;
      }
      return { ...prev, [providerId]: profileId };
    });
    setProxySaveStatus({ type: "", message: "" });
  };

  const applyProxyBindingToAllProviders = () => {
    if (!bulkProxyProfileId) return;

    setProviderProxyBindings((prev) => {
      const next = { ...prev };
      proxyProviders.forEach((provider) => {
        if (provider?.value) {
          next[provider.value] = bulkProxyProfileId;
        }
      });
      return next;
    });
    setProxySaveStatus({ type: "", message: "" });
  };

  const clearAllProviderProxyBindings = () => {
    setProviderProxyBindings((prev) => {
      const next = { ...prev };
      delete next["*"];
      proxyProviders.forEach((provider) => {
        if (provider?.value) {
          delete next[provider.value];
        }
      });
      return next;
    });
    setProxySaveStatus({ type: "", message: "" });
  };

  const saveAdvancedProxySettings = async () => {
    setProxySaving(true);
    setProxySaveStatus({ type: "", message: "" });

    try {
      const sanitizedProfiles = proxyProfiles.map((profile, index) => ({
        id: profile.id || `proxy-${index + 1}`,
        name: profile.name || `Proxy ${index + 1}`,
        allProxy: profile.allProxy || "",
        httpProxy: profile.httpProxy || "",
        httpsProxy: profile.httpsProxy || "",
        noProxy: profile.noProxy || "",
      }));

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyProfiles: sanitizedProfiles,
          providerProxyBindings,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save proxy settings");
      }

      setProxyProfiles(sanitizedProfiles);
      setProxySaveStatus({ type: "success", message: t("settings.proxySaved") });
    } catch (err) {
      setProxySaveStatus({ type: "error", message: t("settings.proxySaveFailed") });
    } finally {
      setProxySaving(false);
    }
  };

  const testProxyProfile = async (profile) => {
    if (!profile?.id) return;

    setProfileTestingId(profile.id);
    setProfileTestStatus((prev) => ({ ...prev, [profile.id]: { type: "", message: "" } }));

    try {
      const res = await fetch("/api/settings/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyProfile: profile }),
      });
      const data = await res.json();

      if (data.success) {
        setProfileTestStatus((prev) => ({
          ...prev,
          [profile.id]: {
            type: "success",
            message: t("settings.proxyTestSuccess"),
          },
        }));
      } else {
        setProfileTestStatus((prev) => ({
          ...prev,
          [profile.id]: {
            type: "error",
            message: t("settings.proxyTestFailed", { error: data.error }),
          },
        }));
      }
    } catch (err) {
      setProfileTestStatus((prev) => ({
        ...prev,
        [profile.id]: {
          type: "error",
          message: t("settings.proxyTestFailed", { error: err.message }),
        },
      }));
    } finally {
      setProfileTestingId("");
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

        {/* Proxy Settings */}
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
            {/* Global fallback proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.allProxy")}</label>
              <ProxyAddressField
                t={t}
                value={proxySettings.allProxy}
                onChange={(next) => updateProxySetting("allProxy", next)}
                placeholder={t("settings.allProxyPlaceholder")}
                disabled={loading}
              />
            </div>

            {/* HTTP Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpProxy")}</label>
              <ProxyAddressField
                t={t}
                value={proxySettings.httpProxy}
                onChange={(next) => updateProxySetting("httpProxy", next)}
                placeholder={t("settings.httpProxyPlaceholder")}
                disabled={loading}
              />
            </div>

            {/* HTTPS Proxy */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpsProxy")}</label>
              <ProxyAddressField
                t={t}
                value={proxySettings.httpsProxy}
                onChange={(next) => updateProxySetting("httpsProxy", next)}
                placeholder={t("settings.httpsProxyPlaceholder")}
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

            {proxyTestStatus.message && (
              <p className={`text-sm ${proxyTestStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
                {proxyTestStatus.message}
              </p>
            )}

            {/* Multiple proxy profiles */}
            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.proxyProfiles")}</p>
                <p className="text-sm text-text-muted">{t("settings.proxyProfilesDesc")}</p>
              </div>
              <Button variant="secondary" onClick={addProxyProfile}>
                <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                {t("settings.addProxy")}
              </Button>
            </div>

            {proxyProfiles.length === 0 && (
              <p className="text-sm text-text-muted">{t("settings.noProxyProfiles")}</p>
            )}

            {proxyProfiles.map((profile, index) => {
              const address = getProxyProfileAddress(profile);
              const status = profileTestStatus[profile.id] || { type: "", message: "" };
              return (
                <div key={profile.id} className="rounded-lg border border-border p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      type="text"
                      placeholder={t("settings.proxyNamePlaceholder", { index: index + 1 })}
                      value={profile.name || ""}
                      onChange={(e) => updateProxyProfileField(profile.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => removeProxyProfile(profile.id)}
                      className="text-red-500"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ProxyAddressField
                      t={t}
                      value={profile.allProxy || ""}
                      onChange={(next) => updateProxyProfileField(profile.id, "allProxy", next)}
                      placeholder={t("settings.allProxyPlaceholder")}
                    />
                    <ProxyAddressField
                      t={t}
                      value={profile.httpProxy || ""}
                      onChange={(next) => updateProxyProfileField(profile.id, "httpProxy", next)}
                      placeholder={t("settings.httpProxyPlaceholder")}
                    />
                    <ProxyAddressField
                      t={t}
                      value={profile.httpsProxy || ""}
                      onChange={(next) => updateProxyProfileField(profile.id, "httpsProxy", next)}
                      placeholder={t("settings.httpsProxyPlaceholder")}
                    />
                    <Input
                      type="text"
                      placeholder={t("settings.noProxyPlaceholder")}
                      value={profile.noProxy || ""}
                      onChange={(e) => updateProxyProfileField(profile.id, "noProxy", e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-muted">{t("settings.proxyAddress")}:</span>
                      {address ? (
                        <code className="text-xs bg-sidebar px-2 py-1 rounded break-all">{address}</code>
                      ) : (
                        <span className="text-text-muted">{t("settings.proxyAddressEmpty")}</span>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => testProxyProfile(profile)}
                      loading={profileTestingId === profile.id}
                      disabled={!profile.allProxy && !profile.httpProxy && !profile.httpsProxy}
                    >
                      {t("settings.testProxy")}
                    </Button>
                  </div>

                  {status.message && (
                    <p className={`text-sm ${status.type === "error" ? "text-red-500" : "text-green-500"}`}>
                      {status.message}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Per-provider binding */}
            <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
              <div>
                <p className="font-medium">{t("settings.providerProxyBinding")}</p>
                <p className="text-sm text-text-muted">{t("settings.providerProxyBindingDesc")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center">
                <select
                  value={bulkProxyProfileId}
                  onChange={(e) => setBulkProxyProfileId(e.target.value)}
                  className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
                >
                  <option value="">{t("settings.selectProxyProfile")}</option>
                  {proxyProfiles.map((profile, index) => (
                    <option key={profile.id} value={profile.id}>
                      {`${profile.name || `Proxy ${index + 1}`} (${getProxyProfileAddress(profile) || t("settings.proxyAddressEmpty")})`}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={applyProxyBindingToAllProviders}
                  disabled={!bulkProxyProfileId || proxyProviders.length === 0}
                >
                  {t("settings.bindAllProviders")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={clearAllProviderProxyBindings}
                  disabled={proxyProviders.length === 0 && Object.keys(providerProxyBindings).length === 0}
                >
                  {t("settings.clearAllBindings")}
                </Button>
              </div>
              <p className="text-xs text-text-muted">{t("settings.bulkBindingDesc")}</p>
              <div className="flex flex-col gap-2">
                {proxyProviders.map((provider) => (
                  <div key={provider.value} className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 items-center">
                    <span className="text-sm">{provider.label}</span>
                    <select
                      value={providerProxyBindings[provider.value] || ""}
                      onChange={(e) => updateProviderProxyBinding(provider.value, e.target.value)}
                      className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
                    >
                      <option value="">{t("settings.useGlobalProxy")}</option>
                      {proxyProfiles.map((profile, index) => (
                        <option key={profile.id} value={profile.id}>
                          {`${profile.name || `Proxy ${index + 1}`} (${getProxyProfileAddress(profile) || t("settings.proxyAddressEmpty")})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <p className="text-xs text-text-muted">{t("settings.proxyBindingHint")}</p>
              <Button variant="primary" onClick={saveAdvancedProxySettings} loading={proxySaving}>
                {t("settings.saveProxyConfig")}
              </Button>
            </div>

            {proxySaveStatus.message && (
              <p className={`text-sm ${proxySaveStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
                {proxySaveStatus.message}
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
