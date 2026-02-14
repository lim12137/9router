"use client";

import { useEffect } from "react";
import useThemeStore from "@/store/themeStore";

export function ThemeProvider({ children }) {
  const { initTheme } = useThemeStore();

  // Theme is already applied via inline script in layout.js before hydration
  // This effect ensures zustand store is properly initialized
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <>{children}</>;
}

