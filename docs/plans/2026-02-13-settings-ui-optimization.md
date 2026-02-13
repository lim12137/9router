# 设置页面 UI 优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构设置页面为标签页导航结构，简化代理配置流程

**Architecture:** 将现有设置页面拆分为5个标签页（通用/安全/代理/外观/高级），使用 URL 参数保持标签状态，代理配置采用简化模式+可展开高级选项的设计

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, 现有组件库 (Card, Button, Input, Toggle, SegmentedControl)

---

## Task 1: 创建标签导航组件 (SettingsTabs)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/SettingsTabs.js`

**Step 1: 创建 SettingsTabs 组件**

```jsx
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
```

**Step 2: 添加标签翻译**

在 `src/shared/i18n/locales.js` 的 `settings` 对象中添加：

```js
// 在 en.settings 对象中添加
settings: {
  // ... 现有内容

  // Tabs
  tabs: {
    general: "General",
    security: "Security",
    proxy: "Proxy",
    appearance: "Appearance",
    advanced: "Advanced",
  },

  // ... 其余内容
}

// 在 zh.settings 对象中添加
settings: {
  // ... 现有内容

  // 标签
  tabs: {
    general: "通用",
    security: "安全",
    proxy: "代理",
    appearance: "外观",
    advanced: "高级",
  },

  // ... 其余内容
}
```

**Step 3: 验证组件渲染**

运行: `npm run dev`
访问: `http://localhost:20128/dashboard/profile`
预期: 应该能看到设置页面（此时还未集成标签组件）

**Step 4: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/SettingsTabs.js src/shared/i18n/locales.js
git commit -m "feat(settings): add SettingsTabs component with i18n support"
```

---

## Task 2: 创建通用设置标签组件 (GeneralTab)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/GeneralTab.js`

**Step 1: 创建 GeneralTab 组件**

从现有 `page.js` 提取本地模式信息、数据管理、路由偏好相关代码：

```jsx
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

      {/* Data Management */}
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
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/GeneralTab.js
git commit -m "feat(settings): add GeneralTab component"
```

---

## Task 3: 创建安全设置标签组件 (SecurityTab)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/SecurityTab.js`

**Step 1: 创建 SecurityTab 组件**

```jsx
"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Card, Button, Toggle, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";

export default function SecurityTab({
  settings,
  loading,
  onUpdateRequireLogin,
  onPasswordChange,
}) {
  const { t } = useI18n();
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [passLoading, setPassLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassStatus({ type: "error", message: t("settings.passwordMatch") });
      return;
    }

    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    const result = await onPasswordChange(passwords.current, passwords.new);

    if (result.success) {
      setPassStatus({ type: "success", message: t("settings.passwordUpdated") });
      setPasswords({ current: "", new: "", confirm: "" });
    } else {
      setPassStatus({ type: "error", message: result.error || t("settings.passwordUpdateFailed") });
    }

    setPassLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
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
              <p className="text-sm text-text-muted">{t("settings.requireLoginDesc")}</p>
            </div>
            <Toggle
              checked={settings.requireLogin === true}
              onChange={() => onUpdateRequireLogin(!settings.requireLogin)}
              disabled={loading}
            />
          </div>

          {settings.requireLogin === true && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4 border-t border-border/50">
              {settings.hasPassword && (
                <Input
                  label={t("settings.currentPassword")}
                  type="password"
                  placeholder="•••••••••"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  required
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t("settings.newPassword")}
                  type="password"
                  placeholder="•••••••••"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  required
                />
                <Input
                  label={t("settings.confirmNewPassword")}
                  type="password"
                  placeholder="•••••••••"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
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
    </div>
  );
}

SecurityTab.propTypes = {
  settings: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  onUpdateRequireLogin: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
};
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/SecurityTab.js
git commit -m "feat(settings): add SecurityTab component"
```

---

## Task 4: 创建外观设置标签组件 (AppearanceTab)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/AppearanceTab.js`

**Step 1: 创建 AppearanceTab 组件**

```jsx
"use client";

import PropTypes from "prop-types";
import { Card } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";

export default function AppearanceTab() {
  const { t } = useI18n();
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div className="flex flex-col gap-6">
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
              <p className="text-sm text-text-muted">{t("settings.darkModeDesc")}</p>
            </div>
            <Toggle checked={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />
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
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/AppearanceTab.js
git commit -m "feat(settings): add AppearanceTab component"
```

---

## Task 5: 创建高级设置标签组件 (AdvancedTab)

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/AdvancedTab.js`

**Step 1: 创建 AdvancedTab 组件**

```jsx
"use client";

import PropTypes from "prop-types";
import { Card, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";

export default function AdvancedTab({
  settings,
  loading,
  onUpdateObservabilitySetting,
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
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
              <p className="text-sm text-text-muted">{t("settings.maxRecordsDesc")}</p>
            </div>
            <Input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={settings.observabilityMaxRecords || 1000}
              onChange={(e) => onUpdateObservabilitySetting("observabilityMaxRecords", parseInt(e.target.value))}
              disabled={loading}
              className="w-28 text-center"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.batchSize")}</p>
              <p className="text-sm text-text-muted">{t("settings.batchSizeDesc")}</p>
            </div>
            <Input
              type="number"
              min="5"
              max="100"
              step="5"
              value={settings.observabilityBatchSize || 20}
              onChange={(e) => onUpdateObservabilitySetting("observabilityBatchSize", parseInt(e.target.value))}
              disabled={loading}
              className="w-28 text-center"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.flushInterval")}</p>
              <p className="text-sm text-text-muted">{t("settings.flushIntervalDesc")}</p>
            </div>
            <Input
              type="number"
              min="1000"
              max="30000"
              step="1000"
              value={settings.observabilityFlushIntervalMs || 5000}
              onChange={(e) => onUpdateObservabilitySetting("observabilityFlushIntervalMs", parseInt(e.target.value))}
              disabled={loading}
              className="w-28 text-center"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("settings.maxJsonSize")}</p>
              <p className="text-sm text-text-muted">{t("settings.maxJsonSizeDesc")}</p>
            </div>
            <Input
              type="number"
              min="100"
              max="10240"
              step="100"
              value={settings.observabilityMaxJsonSize || 1024}
              onChange={(e) => onUpdateObservabilitySetting("observabilityMaxJsonSize", parseInt(e.target.value))}
              disabled={loading}
              className="w-28 text-center"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

AdvancedTab.propTypes = {
  settings: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  onUpdateObservabilitySetting: PropTypes.func.isRequired,
};
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/AdvancedTab.js
git commit -m "feat(settings): add AdvancedTab component"
```

---

## Task 6: 创建代理设置标签组件 (ProxyTab) - 第一部分

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/ProxyTab.js`

**Step 1: 创建 ProxyTab 组件框架**

```jsx
"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Card, Button, Input } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/utils/cn";

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

  // Simple proxy input state
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
              <label className="text-sm font-medium">协议</label>
              <select
                value={simpleProtocol}
                onChange={(e) => {
                  setSimpleProtocol(e.target.value);
                  handleSimpleProxyChange(e.target.value, simpleHost, simplePort);
                }}
                disabled={loading}
                className="w-full py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
              >
                <option value="">无</option>
                {PROXY_PROTOCOL_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">地址</label>
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
              <label className="text-sm font-medium">端口</label>
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
            高级选项
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

      {/* Proxy Profiles - Will be continued in next task */}
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
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/ProxyTab.js
git commit -m "feat(settings): add ProxyTab component with simplified proxy input"
```

---

## Task 7: 创建代理配置文件区块组件

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/ProxyProfilesSection.js`
- Create: `src/app/(dashboard)/dashboard/profile/components/ProxyProfileCard.js`

**Step 1: 创建 ProxyProfileCard 组件**

```jsx
"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Button, Input, Badge } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

const PROXY_PROTOCOL_OPTIONS = [
  { value: "http://", label: "HTTP" },
  { value: "https://", label: "HTTPS" },
  { value: "socks5://", label: "SOCKS5" },
  { value: "socks5h://", label: "SOCKS5h" },
];

function getProxyAddress(profile) {
  return profile?.allProxy || profile?.httpsProxy || profile?.httpProxy || "";
}

export default function ProxyProfileCard({
  profile,
  index,
  boundProviders = [],
  isEditing,
  onToggleEdit,
  onUpdateField,
  onRemove,
  onTest,
  testing,
  testResult,
  t,
}) {
  const address = getProxyAddress(profile);
  const boundCount = boundProviders.length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer"
        onClick={() => onToggleEdit(profile.id)}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">public</span>
          </div>
          <div>
            <p className="font-medium">{profile.name || `代理 ${index + 1}`}</p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {address ? (
                <code className="bg-sidebar px-1.5 py-0.5 rounded">{address}</code>
              ) : (
                <span>{t("settings.proxyAddressEmpty")}</span>
              )}
              {boundCount > 0 && (
                <Badge variant="default" size="sm">{boundCount} 个绑定</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onTest(profile); }}
            loading={testing}
            disabled={!address}
          >
            测试
          </Button>
          <span className="material-symbols-outlined text-text-muted text-[20px]">
            {isEditing ? "expand_less" : "expand_more"}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isEditing && (
        <div className="p-4 border-t border-border flex flex-col gap-3">
          <Input
            label="名称"
            type="text"
            placeholder={t("settings.proxyNamePlaceholder", { index: index + 1 })}
            value={profile.name || ""}
            onChange={(e) => onUpdateField(profile.id, "name", e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label={t("settings.allProxy")}
              type="text"
              placeholder={t("settings.allProxyPlaceholder")}
              value={profile.allProxy || ""}
              onChange={(e) => onUpdateField(profile.id, "allProxy", e.target.value)}
            />
            <Input
              label={t("settings.httpProxy")}
              type="text"
              placeholder={t("settings.httpProxyPlaceholder")}
              value={profile.httpProxy || ""}
              onChange={(e) => onUpdateField(profile.id, "httpProxy", e.target.value)}
            />
            <Input
              label={t("settings.httpsProxy")}
              type="text"
              placeholder={t("settings.httpsProxyPlaceholder")}
              value={profile.httpsProxy || ""}
              onChange={(e) => onUpdateField(profile.id, "httpsProxy", e.target.value)}
            />
            <Input
              label={t("settings.noProxy")}
              type="text"
              placeholder={t("settings.noProxyPlaceholder")}
              value={profile.noProxy || ""}
              onChange={(e) => onUpdateField(profile.id, "noProxy", e.target.value)}
            />
          </div>

          {testResult && (
            <p className={`text-sm ${testResult.type === "error" ? "text-red-500" : "text-green-500"}`}>
              {testResult.message}
            </p>
          )}

          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button variant="ghost" onClick={() => onRemove(profile.id)} className="text-red-500">
              <span className="material-symbols-outlined text-[18px] mr-1">delete</span>
              删除
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

ProxyProfileCard.propTypes = {
  profile: PropTypes.object.isRequired,
  index: PropTypes.number,
  boundProviders: PropTypes.array,
  isEditing: PropTypes.bool,
  onToggleEdit: PropTypes.func.isRequired,
  onUpdateField: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onTest: PropTypes.func.isRequired,
  testing: PropTypes.bool,
  testResult: PropTypes.object,
  t: PropTypes.func.isRequired,
};
```

**Step 2: 创建 ProxyProfilesSection 组件**

```jsx
"use client";

import PropTypes from "prop-types";
import { useState } from "react";
import { Card, Button } from "@/shared/components";
import ProxyProfileCard from "./ProxyProfileCard";

function getProxyAddress(profile) {
  return profile?.allProxy || profile?.httpsProxy || profile?.httpProxy || "";
}

export default function ProxyProfilesSection({
  proxyProfiles,
  providerProxyBindings,
  proxyProviders,
  loading,
  onAddProfile,
  onRemoveProfile,
  onUpdateField,
  onUpdateBinding,
  onSave,
  saving,
  saveStatus,
  t,
}) {
  const [editingId, setEditingId] = useState(null);
  const [testingId, setTestingId] = useState("");
  const [testResults, setTestResults] = useState({});

  // Get providers bound to a profile
  const getBoundProviders = (profileId) => {
    return Object.entries(providerProxyBindings || {})
      .filter(([, boundId]) => boundId === profileId)
      .map(([providerId]) => proxyProviders.find(p => p.value === providerId)?.label || providerId);
  };

  const handleTest = async (profile) => {
    if (!profile?.id) return;
    setTestingId(profile.id);
    // Call test API - this would be passed from parent
    setTestingId("");
  };

  return (
    <>
      {/* Proxy Profiles List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium">{t("settings.proxyProfiles")}</p>
            <p className="text-sm text-text-muted">{t("settings.proxyProfilesDesc")}</p>
          </div>
          <Button variant="secondary" onClick={onAddProfile} icon="add">
            {t("settings.addProxy")}
          </Button>
        </div>

        {proxyProfiles.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">{t("settings.noProxyProfiles")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {proxyProfiles.map((profile, index) => (
              <ProxyProfileCard
                key={profile.id}
                profile={profile}
                index={index}
                boundProviders={getBoundProviders(profile.id)}
                isEditing={editingId === profile.id}
                onToggleEdit={(id) => setEditingId(editingId === id ? null : id)}
                onUpdateField={onUpdateField}
                onRemove={onRemoveProfile}
                onTest={handleTest}
                testing={testingId === profile.id}
                testResult={testResults[profile.id]}
                t={t}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Provider Binding Table */}
      {proxyProfiles.length > 0 && (
        <Card>
          <div className="mb-4">
            <p className="font-medium">{t("settings.providerProxyBinding")}</p>
            <p className="text-sm text-text-muted">{t("settings.providerProxyBindingDesc")}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">提供商</th>
                  <th className="text-left py-2 font-medium">代理配置</th>
                </tr>
              </thead>
              <tbody>
                {proxyProviders.map((provider) => (
                  <tr key={provider.value} className="border-b border-border/50">
                    <td className="py-2">{provider.label}</td>
                    <td className="py-2">
                      <select
                        value={providerProxyBindings[provider.value] || ""}
                        onChange={(e) => onUpdateBinding(provider.value, e.target.value)}
                        className="w-full max-w-[280px] py-1.5 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none"
                      >
                        <option value="">{t("settings.useGlobalProxy")}</option>
                        {proxyProfiles.map((profile, index) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name || `代理 ${index + 1}`}
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
            <Button onClick={onSave} loading={saving}>
              {t("settings.saveProxyConfig")}
            </Button>
          </div>

          {saveStatus.message && (
            <p className={`text-sm mt-2 ${saveStatus.type === "error" ? "text-red-500" : "text-green-500"}`}>
              {saveStatus.message}
            </p>
          )}
        </Card>
      )}
    </>
  );
}

ProxyProfilesSection.propTypes = {
  proxyProfiles: PropTypes.array,
  providerProxyBindings: PropTypes.object,
  proxyProviders: PropTypes.array,
  loading: PropTypes.bool,
  onAddProfile: PropTypes.func.isRequired,
  onRemoveProfile: PropTypes.func.isRequired,
  onUpdateField: PropTypes.func.isRequired,
  onUpdateBinding: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  saveStatus: PropTypes.object,
  t: PropTypes.func.isRequired,
};
```

**Step 3: 更新 ProxyTab 导入 ProxyProfilesSection**

在 ProxyTab.js 中添加导入并确保组件正确渲染。

**Step 4: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/ProxyProfilesSection.js src/app/\(dashboard\)/dashboard/profile/components/ProxyProfileCard.js
git commit -m "feat(settings): add ProxyProfilesSection and ProxyProfileCard components"
```

---

## Task 8: 创建组件索引文件

**Files:**
- Create: `src/app/(dashboard)/dashboard/profile/components/index.js`

**Step 1: 创建索引文件**

```jsx
export { default as SettingsTabs } from "./SettingsTabs";
export { default as GeneralTab } from "./GeneralTab";
export { default as SecurityTab } from "./SecurityTab";
export { default as ProxyTab } from "./ProxyTab";
export { default as AppearanceTab } from "./AppearanceTab";
export { default as AdvancedTab } from "./AdvancedTab";
export { default as ProxyProfilesSection } from "./ProxyProfilesSection";
export { default as ProxyProfileCard } from "./ProxyProfileCard";
```

**Step 2: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/components/index.js
git commit -m "feat(settings): add components index file"
```

---

## Task 9: 重构主页面

**Files:**
- Modify: `src/app/(dashboard)/dashboard/profile/page.js`

**Step 1: 重写主页面**

将现有的 page.js 重构为使用标签导航的新结构：

```jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardSkeleton } from "@/shared/components";
import { useI18n } from "@/shared/i18n";
import { APP_CONFIG } from "@/shared/constants/config";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import {
  SettingsTabs,
  GeneralTab,
  SecurityTab,
  ProxyTab,
  AppearanceTab,
  AdvancedTab,
} from "./components";

const TABS = ["general", "security", "proxy", "appearance", "advanced"];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Get initial tab from URL
  const tabParam = searchParams.get("tab");
  const initialTab = TABS.includes(tabParam) ? tabParam : "general";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [settings, setSettings] = useState({ fallbackStrategy: "fill-first" });
  const [loading, setLoading] = useState(true);

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

  // Settings update handlers
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

  const handlePasswordChange = async (currentPassword, newPassword) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.error || t("settings.passwordUpdateFailed") };
    } catch (err) {
      return { success: false, error: t("errors.unknownError") };
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

  // Proxy handlers
  const updateProxySetting = async (key, value) => {
    setProxySettings(prev => ({ ...prev, [key]: value }));
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      console.error("Failed to update proxy setting:", err);
    }
  };

  const testProxy = async () => {
    try {
      const res = await fetch("/api/settings/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxySettings),
      });
      const data = await res.json();
      if (data.success) {
        return { type: "success", message: t("settings.proxyTestSuccess") };
      }
      return { type: "error", message: t("settings.proxyTestFailed", { error: data.error }) };
    } catch (err) {
      return { type: "error", message: t("settings.proxyTestFailed", { error: err.message }) };
    }
  };

  const addProxyProfile = () => {
    const id = `proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setProxyProfiles(prev => [...prev, { id, name: "", allProxy: "", httpProxy: "", httpsProxy: "", noProxy: "" }]);
  };

  const removeProxyProfile = (profileId) => {
    setProxyProfiles(prev => prev.filter(p => p.id !== profileId));
    setProviderProxyBindings(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([providerId, boundId]) => {
        if (boundId === profileId) delete next[providerId];
      });
      return next;
    });
  };

  const updateProxyProfileField = (profileId, key, value) => {
    setProxyProfiles(prev => prev.map(p => p.id === profileId ? { ...p, [key]: value } : p));
  };

  const updateProviderProxyBinding = (providerId, profileId) => {
    setProviderProxyBindings(prev => {
      if (!profileId) {
        const next = { ...prev };
        delete next[providerId];
        return next;
      }
      return { ...prev, [providerId]: profileId };
    });
  };

  const saveAdvancedProxySettings = async () => {
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

      if (!res.ok) throw new Error("Failed to save");

      setProxyProfiles(sanitizedProfiles);
      return { type: "success", message: t("settings.proxySaved") };
    } catch (err) {
      return { type: "error", message: t("settings.proxySaveFailed") };
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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
          proxySettings={proxySettings}
          proxyProfiles={proxyProfiles}
          providerProxyBindings={providerProxyBindings}
          proxyProviders={proxyProviders}
          loading={loading}
          onUpdateProxySetting={updateProxySetting}
          onTestProxy={testProxy}
          onAddProxyProfile={addProxyProfile}
          onRemoveProxyProfile={removeProxyProfile}
          onUpdateProxyProfileField={updateProxyProfileField}
          onUpdateProviderProxyBinding={updateProviderProxyBinding}
          onSaveAdvancedProxySettings={saveAdvancedProxySettings}
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

      {/* App Info Footer */}
      <div className="text-center text-sm text-text-muted py-4 mt-6">
        <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
      </div>
    </div>
  );
}
```

**Step 2: 验证页面加载**

运行: `npm run dev`
访问: `http://localhost:20128/dashboard/profile`
预期: 能看到标签导航和通用设置内容

**Step 3: 提交**

```bash
git add src/app/\(dashboard\)/dashboard/profile/page.js
git commit -m "refactor(settings): restructure page with tab navigation"
```

---

## Task 10: 最终测试与修复

**Step 1: 运行开发服务器**

```bash
npm run dev
```

**Step 2: 手动测试清单**

1. 访问 `/dashboard/profile` - 验证默认显示通用标签
2. 点击各标签 - 验证标签切换和 URL 参数更新
3. 直接访问 `/dashboard/profile?tab=proxy` - 验证 URL 参数生效
4. 测试代理简化输入 - 验证协议/地址/端口输入
5. 测试代理配置文件添加/编辑/删除
6. 测试提供商代理绑定
7. 测试密码修改
8. 测试路由策略切换
9. 测试外观主题切换
10. 测试高级设置数值修改

**Step 3: 构建测试**

```bash
npm run build
```

预期: 构建成功，无错误

**Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(settings): complete UI optimization with tab navigation"
```

---

## 完成标准

- [ ] 标签导航正常工作
- [ ] URL 参数保持标签状态
- [ ] 代理简化输入功能正常
- [ ] 代理配置文件管理功能正常
- [ ] 提供商绑定功能正常
- [ ] 所有现有设置功能保持可用
- [ ] 构建无错误
- [ ] 代码已提交
