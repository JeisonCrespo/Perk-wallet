import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDb } from '../db/database';

export type AppTheme = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  headerBg: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  chipBg: string;
  primary: string;
  primaryLight: string;
  accentLime: string;
  accentLimeText: string;
  tileBg: string;
  tileBorder: string;
  success: string;
  danger: string;
  warning: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#041B15',
  card: '#0C2B22',
  cardBorder: '#144637',
  headerBg: '#062B20',
  text: '#F0FDF4',
  textSecondary: '#A7F3D0',
  textMuted: '#6EE7B7',
  inputBg: '#07241C',
  chipBg: '#0E362B',
  primary: '#10B981',
  primaryLight: '#064E3B',
  accentLime: '#A7F3D0',
  accentLimeText: '#064E3B',
  tileBg: '#092F24',
  tileBorder: '#144637',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F4F7F5',
  card: '#FFFFFF',
  cardBorder: '#E1ECE6',
  headerBg: '#083E31',
  text: '#062E23',
  textSecondary: '#165A46',
  textMuted: '#64748B',
  inputBg: '#F0FDF4',
  chipBg: '#F0FDF4',
  primary: '#064E3B',
  primaryLight: '#ECFDF5',
  accentLime: '#A7F3D0',
  accentLimeText: '#064E3B',
  tileBg: '#F0FDF4',
  tileBorder: '#D1FAE5',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
};

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (newTheme: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('dark');

  // Cargar tema guardado en SQLite
  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const row = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_settings WHERE key = 'app_theme'"
        );
        if (row && (row.value === 'light' || row.value === 'dark')) {
          setThemeState(row.value as AppTheme);
        }
      } catch {}
    })();
  }, []);

  const setTheme = useCallback(async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('app_theme', ?)",
        [newTheme]
      );
    } catch {}
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(nextTheme);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return ctx;
}

