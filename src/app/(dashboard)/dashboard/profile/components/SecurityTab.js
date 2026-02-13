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
