"use client";

import { useI18n } from "@/shared/i18n";

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, supportedLanguages, t } = useI18n();

  return (
    <div className={`relative ${className}`}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none bg-transparent text-text-main text-sm font-medium pr-8 pl-2 py-1.5 rounded-lg border border-border/50 hover:border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      >
        {Object.entries(supportedLanguages).map(([code, { name, flag }]) => (
          <option key={code} value={code}>
            {flag} {name}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-sm">
        expand_more
      </span>
    </div>
  );
}
