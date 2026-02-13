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
