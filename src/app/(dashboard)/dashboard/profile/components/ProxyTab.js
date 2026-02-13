"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Card, Button, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import ProxyProfilesSection from "./ProxyProfilesSection";

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

export default function ProxyTab({
  proxySettings,
  proxyProfiles,
  providerProxyBindings,
  proxyProviders,
  loading,
  onUpdateProxySetting,
  onTestProxy,
  onAddProxyProfile,
  onRemoveProxyProfile,
  onUpdateProxyProfileField,
  onUpdateProviderProxyBinding,
  onSaveAdvancedProxySettings,
}) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [proxyTestLoading, setProxyTestLoading] = useState(false);
  const [proxyTestStatus, setProxyTestStatus] = useState({ type: "", message: "" });
  const [proxySaving, setProxySaving] = useState(false);
  const [proxySaveStatus, setProxySaveStatus] = useState({ type: "", message: "" });

  const parsed = parseProxyValue(proxySettings.allProxy);
  const [simpleProtocol, setSimpleProtocol] = useState(parsed.protocol);
  const [simpleHost, setSimpleHost] = useState(parsed.host);
  const [simplePort, setSimplePort] = useState(parsed.port);

  const handleSimpleProxyChange = (protocol, host, port) => {
    const value = buildProxyValue(protocol, host, port);
    onUpdateProxySetting("allProxy", value);
  };

  const handleTestProxy = async () => {
    setProxyTestLoading(true);
    setProxyTestStatus({ type: "", message: "" });
    const result = await onTestProxy();
    setProxyTestStatus(result);
    setProxyTestLoading(false);
  };

  const handleSave = async () => {
    setProxySaving(true);
    setProxySaveStatus({ type: "", message: "" });
    const result = await onSaveAdvancedProxySettings();
    setProxySaveStatus(result);
    setProxySaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Simple Proxy Card */}
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

        {/* Simple Mode */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[130px_1fr_100px] gap-2 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("settings.proxyProtocolManual")}</label>
              <select
                value={simpleProtocol}
                onChange={(e) => {
                  setSimpleProtocol(e.target.value);
                  handleSimpleProxyChange(e.target.value, simpleHost, simplePort);
                }}
                disabled={loading}
                className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
              >
                <option value="">{t("common.none")}</option>
                {PROXY_PROTOCOL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("common.host")}</label>
              <Input
                type="text"
                placeholder="127.0.0.1"
                value={simpleHost}
                onChange={(e) => {
                  setSimpleHost(e.target.value);
                  handleSimpleProxyChange(simpleProtocol, e.target.value, simplePort);
                }}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t("common.port")}</label>
              <Input
                type="text"
                placeholder="7890"
                value={simplePort}
                onChange={(e) => {
                  setSimplePort(e.target.value);
                  handleSimpleProxyChange(simpleProtocol, simpleHost, e.target.value);
                }}
                disabled={loading}
              />
            </div>
          </div>

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

          {/* Toggle Advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-main transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {showAdvanced ? "expand_less" : "expand_more"}
            </span>
            {t("common.advancedOptions")}
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="flex flex-col gap-4 pt-4 border-t border-border/50 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.httpProxyPlaceholder")}
                value={proxySettings.httpProxy}
                onChange={(e) => onUpdateProxySetting("httpProxy", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.httpsProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.httpsProxyPlaceholder")}
                value={proxySettings.httpsProxy}
                onChange={(e) => onUpdateProxySetting("httpsProxy", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("settings.noProxy")}</label>
              <Input
                type="text"
                placeholder={t("settings.noProxyPlaceholder")}
                value={proxySettings.noProxy}
                onChange={(e) => onUpdateProxySetting("noProxy", e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-text-muted">{t("settings.noProxyDesc")}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Proxy Profiles Section */}
      <ProxyProfilesSection
        proxyProfiles={proxyProfiles}
        providerProxyBindings={providerProxyBindings}
        proxyProviders={proxyProviders}
        loading={loading}
        onAddProfile={onAddProxyProfile}
        onRemoveProfile={onRemoveProxyProfile}
        onUpdateField={onUpdateProxyProfileField}
        onUpdateBinding={onUpdateProviderProxyBinding}
        onSave={handleSave}
        saving={proxySaving}
        saveStatus={proxySaveStatus}
        t={t}
      />
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
