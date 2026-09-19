"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.scss";

type Theme = "light" | "dark";

function getAppliedTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setTheme(getAppliedTheme()));
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem("artifacts-theme")) return;
      const nextTheme = event.matches ? "dark" : "light";
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };
    systemTheme.addEventListener("change", handleSystemThemeChange);
    return () => {
      window.cancelAnimationFrame(frame);
      systemTheme.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const isDark = theme === "dark";
  const label = theme ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle colour theme";

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      onClick={() => {
        const nextTheme: Theme = getAppliedTheme() === "dark" ? "light" : "dark";
        localStorage.setItem("artifacts-theme", nextTheme);
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
    >
      <span aria-hidden="true" />
    </button>
  );
}
