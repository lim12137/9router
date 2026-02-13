"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Card, Button, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";

const PROXY_PROTOCOL_OPTIONS = [
  { value: "http://", label: "HTTP" },
  { value: "https://", label: "HTTPS" },
  { value: "socks5://", label: "SOCKS5" },
  { value: "socks5h://", label: "SOCKS5h" },
  { value: "socks4://", label: "SOCKS4" },
  { value: "socks4a://", label: "SOCKS4a" },
];

function parseProxyValue(value) {
  if (!value) return { protocol: "", host: "", port: "" };
  const match = value.match(/^([a-z][a-z0-9+.-]*:\/\/)?([^:]+):(\d+)$/i);
  if (!match) return { protocol: "", host: value, port: "" };
  return {
    protocol: match[1] || "",
    host: match[2],
    port: match[3],
  };
}

function buildProxyValue(protocol, host, port) {
  if (!host && !port) return "";
  return `${protocol}${host}:${port}`;
}

function ProxyInput({ label, value, onChange, placeholder, disabled }) {
  const parsed = parseProxyValue(value);
  const [protocol, setProtocol] = useState(parsed.protocol);
  const [host, setHost] = useState(parsed.host);
  const [port, setPort] = useState(parsed.port);

  const handleChange = (newProtocol, newHost, newPort) => {
    const proxyValue = buildProxyValue(newProtocol, newHost, newPort);
    onChange(proxyValue);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="grid grid-cols-[100px_1fr_80px] gap-2">
        <select
          value={protocol}
          onChange={(e) => {
            setProtocol(e.target.value);
            handleChange(e.target.value, host, port);
          }}
          disabled={disabled}
          className="py-2 px-2 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
        >
          <option value="">--</option>
          {PROXY_PROTOCOL_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <Input
          type="text"
          placeholder={placeholder || "127.0.0.1"}
          value={host}
          onChange={(e) => {
            setHost(e.target.value);
            handleChange(protocol, e.target.value, port);
          }}
          disabled={disabled}
        />
        <Input
          type="text"
          placeholder="7890"
          value={port}
          onChange={(e) => {
            setPort(e.target.value);
            handleChange(protocol, host, e.target.value);
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function ProxyProfileCard({ profile, index, onUpdateField, onRemove, onTest, testing, t }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const address = profile.allProxy || profile.httpProxy || profile.httpsProxy || "";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">vpn_lock</span>
          </div>
          <div>
            <p className="font-medium">{profile.name || `${t("settings.proxy")} ${index + 1}`}</p>
            <p className="text-xs text-text-muted">
              {address || t("settings.proxyAddressEmpty")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTest(profile);
            }}
            loading={testing}
            disabled={!address}
          >
            {t("settings.testProxy")}
          </Button>
          <span className="material-symbols-outlined text-text-muted text-[20px]">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-border flex flex-col gap-3">
          <Input
            label={t("settings.proxyName")}
            type="text"
            placeholder={t("settings.proxyNamePlaceholder", { index: index + 1 })}
            value={profile.name || ""}
            onChange={(e) => onUpdateField(profile.id, "name", e.target.value)}
          />
          <ProxyInput
            label={t("settings.allProxy")}
            value={profile.allProxy || ""}
            onChange={(value) => onUpdateField(profile.id, "allProxy", value)}
            placeholder="127.0.0.1"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ProxyInput
              label={t("settings.httpProxy")}
              value={profile.httpProxy || ""}
              onChange={(value) => onUpdateField(profile.id, "httpProxy", value)}
            />
            <ProxyInput
              label={t("settings.httpsProxy")}
              value={profile.httpsProxy || ""}
              onChange={(value) => onUpdateField(profile.id, "httpsProxy", value)}
            />
          </div>
          <Input
            label={t("settings.noProxy")}
            type="text"
            placeholder={t("settings.noProxyPlaceholder")}
            value={profile.noProxy || ""}
            onChange={(e) => onUpdateField(profile.id, "noProxy", e.target.value)}
          />
          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button variant="ghost" onClick={() => onRemove(profile.id)} className="text-red-500">
              <span className="material-symbols-outlined text-[18px] mr-1">delete</span>
              {t("common.delete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProxyTab({
  proxySettings = {},
  proxyProfiles = [],
  providerProxyBindings = {},
  proxyProviders = [],
  loading = false,
  onUpdateProxySetting = () => {},
  onTestProxy = async () => {},
  onAddProxyProfile = () => {},
  onRemoveProxyProfile = () => {},
  onUpdateProxyProfileField = () => {},
  onUpdateProviderProxyBinding = () => {},
  onSaveAdvancedProxySettings = async () => {},
}) {
  const { t } = useI18n();
  const [proxyTestLoading, setProxyTestLoading] = useState(false);
  const [proxyTestStatus, setProxyTestStatus] = useState({ type: "", message: "" });
  const [proxySaving, setProxySaving] = useState(false);
  const [proxySaveStatus, setProxySaveStatus] = useState({ type: "", message: "" });
  const [testingProfileId, setTestingProfileId] = useState("");

  const handleTestProxy = async () => {
    setProxyTestLoading(true);
    setProxyTestStatus({ type: "", message: "" });
    const result = await onTestProxy();
    setProxyTestStatus(result);
    setProxyTestLoading(false);
  };

  const handleTestProfile = async (profile) => {
    setTestingProfileId(profile.id);
    try {
      const res = await fetch("/api/settings/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyProfile: profile }),
      });
      const data = await res.json();
      if (data.success) {
        setProxyTestStatus({ type: "success", message: t("settings.proxyTestSuccess") });
      } else {
        setProxyTestStatus({ type: "error", message: t("settings.proxyTestFailed", { error: data.error }) });
      }
    } catch (err) {
      setProxyTestStatus({ type: "error", message: t("settings.proxyTestFailed", { error: err.message }) });
    }
    setTestingProfileId("");
  };

  const handleSave = async () => {
    setProxySaving(true);
    setProxySaveStatus({ type: "", message: "" });
    await onSaveAdvancedProxySettings();
    setProxySaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 第一段：全局代理设置 */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
            <span className="material-symbols-outlined text-[20px]">public</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("settings.globalProxy")}</h3>
            <p className="text-sm text-text-muted">{t("settings.globalProxyDesc")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ProxyInput
            label={t("settings.allProxy")}
            value={proxySettings.allProxy || ""}
            onChange={(value) => onUpdateProxySetting("allProxy", value)}
            placeholder="127.0.0.1"
            disabled={loading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProxyInput
              label={t("settings.httpProxy")}
              value={proxySettings.httpProxy || ""}
              onChange={(value) => onUpdateProxySetting("httpProxy", value)}
              disabled={loading}
            />
            <ProxyInput
              label={t("settings.httpsProxy")}
              value={proxySettings.httpsProxy || ""}
              onChange={(value) => onUpdateProxySetting("httpsProxy", value)}
              disabled={loading}
            />
          </div>

          <Input
            label={t("settings.noProxy")}
            type="text"
            placeholder={t("settings.noProxyPlaceholder")}
            value={proxySettings.noProxy || ""}
            onChange={(e) => onUpdateProxySetting("noProxy", e.target.value)}
            disabled={loading}
          />

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <p className="text-xs text-text-muted">
              {proxySettings.allProxy ? t("settings.proxyEnabled") : t("settings.proxyDisabled")}
            </p>
            <Button
              variant="secondary"
              onClick={handleTestProxy}
              loading={proxyTestLoading}
              disabled={!proxySettings.allProxy}
              icon="network_check"
            >
              {t("settings.testProxy")}
            </Button>
          </div>

          {proxyTestStatus.message && (
            <p className={`text-sm ${proxyTestStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
              {proxyTestStatus.message}
            </p>
          )}
        </div>
      </Card>

      {/* 第二段：代理列表 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <span className="material-symbols-outlined text-[20px]">list</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("settings.proxyProfiles")}</h3>
              <p className="text-sm text-text-muted">{t("settings.proxyProfilesDesc")}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={onAddProxyProfile} icon="add">
            {t("settings.addProxy")}
          </Button>
        </div>

        {(!proxyProfiles || proxyProfiles.length === 0) ? (
          <p className="text-sm text-text-muted text-center py-4">{t("settings.noProxyProfiles")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {proxyProfiles.map((profile, index) => (
              <ProxyProfileCard
                key={profile.id}
                profile={profile}
                index={index}
                onUpdateField={onUpdateProxyProfileField}
                onRemove={onRemoveProxyProfile}
                onTest={handleTestProfile}
                testing={testingProfileId === profile.id}
                t={t}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 第三段：提供商绑定 */}
      {proxyProfiles && proxyProfiles.length > 0 && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <span className="material-symbols-outlined text-[20px]">link</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("settings.providerProxyBinding")}</h3>
              <p className="text-sm text-text-muted">{t("settings.providerProxyBindingDesc")}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">{t("settings.provider")}</th>
                  <th className="text-left py-2 font-medium">{t("settings.proxyConfig")}</th>
                </tr>
              </thead>
              <tbody>
                {proxyProviders.map((provider) => (
                  <tr key={provider.value} className="border-b border-border/50">
                    <td className="py-2">{provider.label}</td>
                    <td className="py-2">
                      <select
                        value={providerProxyBindings[provider.value] || ""}
                        onChange={(e) => onUpdateProviderProxyBinding(provider.value, e.target.value)}
                        className="w-full max-w-[280px] py-1.5 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
                      >
                        <option value="">{t("settings.useGlobalProxy")}</option>
                        {proxyProfiles.map((profile, index) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name || `${t("settings.proxy")} ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
            <p className="text-xs text-text-muted">{t("settings.proxyBindingHint")}</p>
            <Button onClick={handleSave} loading={proxySaving}>
              {t("settings.saveProxyConfig")}
            </Button>
          </div>

          {proxySaveStatus?.message && (
            <p className={`text-sm mt-2 ${proxySaveStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
              {proxySaveStatus.message}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

ProxyTab.propTypes = {
  proxySettings: PropTypes.object.isRequired,
  proxyProfiles: PropTypes.array,
  providerProxyBindings: PropTypes.object,
  proxyProviders: PropTypes.array,
  loading: PropTypes.bool,
  onUpdateProxySetting: PropTypes.func.isRequired,
  onTestProxy: PropTypes.func.isRequired,
  onAddProxyProfile: PropTypes.func.isRequired,
  onRemoveProxyProfile: PropTypes.func.isRequired,
  onUpdateProxyProfileField: PropTypes.func.isRequired,
  onUpdateProviderProxyBinding: PropTypes.func.isRequired,
  onSaveAdvancedProxySettings: PropTypes.func.isRequired,
};
