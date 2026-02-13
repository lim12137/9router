"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Button, Toggle, Input } from "@/shared/components";
import { useTheme } from "@/shared/hooks/useTheme";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { SettingsTabs, GeneralTab, SecurityTab, ProxyTab, AppearanceTab, AdvancedTab } from "./components";

const TABS = ["general", "security", "proxy", "appearance", "advanced"];

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { theme, setTheme, isDark } = useTheme();

  const tabParam = searchParams.get("tab");
  const initialTab = TABS.includes(tabParam) ? tabParam : "general";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [settings, setSettings] = useState({ fallbackStrategy: "fill-first" });
  const [loading, setLoading] = useState(true);

  // Password change state for SecurityTab
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

  // Additional state for proxy functionality
  const [proxyTestLoading, setProxyTestLoading] = useState(false);
  const [proxyTestStatus, setProxyTestStatus] = useState({ type: "", message: "" });
  const [bulkProxyProfileId, setBulkProxyProfileId] = useState("");
  const [proxySaving, setProxySaving] = useState(false);
  const [proxySaveStatus, setProxySaveStatus] = useState({ type: "", message: "" });
  const [profileTestingId, setProfileTestingId] = useState("");
  const [profileTestStatus, setProfileTestStatus] = useState({});

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

        const providerMap = new Map();
        [...builtins, ...customNodes].forEach((item) => {
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

  // Handle tab change with URL update
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/dashboard/profile?tab=${tab}`, { scroll: false });
  };

  const handlePasswordChange = async (current, newPass) => {
    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: newPass,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || t("settings.passwordUpdateFailed") };
      }
    } catch (err) {
      return { success: false, error: t("errors.unknownError") };
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
    <div className="max-w-3xl mx-auto">
      <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === "general" && (
        <GeneralTab
          settings={settings}
          loading={loading}
          onUpdateFallbackStrategy={updateFallbackStrategy}
          onUpdateStickyLimit={updateStickyLimit}
        />
      )}

      {activeTab === "security" && (
        <SecurityTab
          settings={settings}
          loading={loading}
          onUpdateRequireLogin={updateRequireLogin}
          onPasswordChange={handlePasswordChange}
        />
      )}

      {activeTab === "proxy" && (
        <ProxyTab
          loading={loading}
          proxySettings={proxySettings}
          proxyProfiles={proxyProfiles}
          providerProxyBindings={providerProxyBindings}
          proxyProviders={proxyProviders}
          onUpdateProxySetting={updateProxySetting}
          onTestProxy={async () => {
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
          }}
          onAddProxyProfile={addProxyProfile}
          onRemoveProxyProfile={removeProxyProfile}
          onUpdateProxyProfileField={updateProxyProfileField}
          onUpdateProviderProxyBinding={updateProviderProxyBinding}
          onSaveAdvancedProxySettings={async () => {
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
              if (!res.ok) throw new Error("Failed to save proxy settings");
              setProxyProfiles(sanitizedProfiles);
              setProxySaveStatus({ type: "success", message: t("settings.proxySaved") });
            } catch (err) {
              setProxySaveStatus({ type: "error", message: t("settings.proxySaveFailed") });
            } finally {
              setProxySaving(false);
            }
          }}
        />
      )}

      {activeTab === "appearance" && <AppearanceTab />}

      {activeTab === "advanced" && (
        <AdvancedTab
          settings={settings}
          loading={loading}
          onUpdateObservabilitySetting={updateObservabilitySetting}
        />
      )}

      {/* App Info */}
      <div className="text-center text-sm text-text-muted py-6">
        <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
        <p className="mt-1">{t("endpoint.runningOnMachine")} - {t("endpoint.dataStoredLocally", { path: "" })}</p>
      </div>
    </div>
  );
}
