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

  const getBoundProviders = (profileId) => {
    return Object.entries(providerProxyBindings || {})
      .filter(([, boundId]) => boundId === profileId)
      .map(([providerId]) => proxyProviders.find(p => p.value === providerId)?.label || providerId);
  };

  const handleTest = async (profile) => {
    if (!profile?.id) return;
    setTestingId(profile.id);
    // Test logic would be passed from parent
    setTestingId("");
  };

  return (
    <>
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
