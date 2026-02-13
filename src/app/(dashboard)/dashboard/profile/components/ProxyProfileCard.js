"use client";

import PropTypes from "prop-types";
import { Button, Input, Badge } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

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
