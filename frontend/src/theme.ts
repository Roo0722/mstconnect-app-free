// MSTConnect design tokens — dark-first palette echoing the Philippine flag.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0a0a0c",
  onSurface: "#f5f2ea",
  surfaceSecondary: "#101014",
  onSurfaceSecondary: "#f5f2ea",
  surfaceTertiary: "#141419",
  onSurfaceTertiary: "#f5f2ea",
  surfaceInverse: "#f5f2ea",
  onSurfaceInverse: "#0a0a0c",
  muted: "rgba(245, 242, 234, 0.64)",
  finePrint: "rgba(245, 242, 234, 0.40)",

  brand: "#e0362c",
  onBrand: "#f5f2ea",
  brandPrimary: "#e0362c",
  onBrandPrimary: "#f5f2ea",
  brandSecondary: "#fcd116",
  onBrandSecondary: "#0a0a0c",
  brandTertiary: "rgba(224, 54, 44, 0.15)",
  onBrandTertiary: "#e0362c",

  success: "#34d399",
  onSuccess: "#0a0a0c",
  warning: "#fcd116",
  onWarning: "#0a0a0c",
  error: "#e0362c",
  onError: "#f5f2ea",
  info: "#3b82f6",
  onInfo: "#f5f2ea",

  border: "#2a2a2e",
  borderStrong: "#fcd116",
  divider: "#1a1a20",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Lock to dark; MSTConnect is a dark-first app.
setColorScheme?.("dark");

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  // Always dark for MSTConnect.
  void system;
  return { scheme: "dark", colors: themes.dark };
}

export const colors = themes.dark;

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
