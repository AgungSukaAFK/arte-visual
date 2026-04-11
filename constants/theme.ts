import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

export type AppThemeMode = "light" | "dark";

type ThemePalette = {
  mode: AppThemeMode;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentContrast: string;
  canvas: string;
  canvasMuted: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  borderSubtle: string;
  borderStrong: string;
  textStrong: string;
  textMuted: string;
  textSoft: string;
  icon: string;
  success: string;
  warning: string;
  danger: string;
  shadow: string;
  mapPin: string;
};

export const appThemePalette: Record<AppThemeMode, ThemePalette> = {
  light: {
    mode: "light",
    accent: "#2F6FED",
    accentStrong: "#1D4ED8",
    accentSoft: "#E8F0FF",
    accentContrast: "#F8FAFF",
    canvas: "#F4F6FB",
    canvasMuted: "#EDF1F7",
    surface: "#FFFFFF",
    surfaceMuted: "#F8FAFC",
    surfaceStrong: "#0F172A",
    borderSubtle: "#D9E1EC",
    borderStrong: "#B7C4D6",
    textStrong: "#162033",
    textMuted: "#5B667A",
    textSoft: "#7C879B",
    icon: "#22304A",
    success: "#1F8A5B",
    warning: "#C97A12",
    danger: "#D14343",
    shadow: "#0F172A",
    mapPin: "#0891B2",
  },
  dark: {
    mode: "dark",
    accent: "#6EA8FF",
    accentStrong: "#8FB9FF",
    accentSoft: "#102341",
    accentContrast: "#0E1C34",
    canvas: "#0C1220",
    canvasMuted: "#131C2B",
    surface: "#161F2F",
    surfaceMuted: "#1B2638",
    surfaceStrong: "#E8EEF9",
    borderSubtle: "#2A3850",
    borderStrong: "#3B4B67",
    textStrong: "#F3F6FB",
    textMuted: "#B5C0D4",
    textSoft: "#8A97AF",
    icon: "#E6EDF9",
    success: "#5BD39A",
    warning: "#F2B85B",
    danger: "#FF8A8A",
    shadow: "#020617",
    mapPin: "#38BDF8",
  },
};

export function resolveThemeMode(colorScheme?: string | null): AppThemeMode {
  return colorScheme === "dark" ? "dark" : "light";
}

export function getAppTheme(colorScheme?: string | null) {
  return appThemePalette[resolveThemeMode(colorScheme)];
}

export function getNavigationTheme(colorScheme?: string | null): Theme {
  const palette = getAppTheme(colorScheme);
  const base = palette.mode === "dark" ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.canvas,
      card: palette.surface,
      text: palette.textStrong,
      border: palette.borderSubtle,
      notification: palette.danger,
    },
  };
}

export function getTabBarScreenOptions(
  colorScheme?: string | null,
): BottomTabNavigationOptions {
  const palette = getAppTheme(colorScheme);

  return {
    headerShown: false,
    tabBarActiveTintColor: palette.accent,
    tabBarInactiveTintColor: palette.textSoft,
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderTopColor: palette.borderSubtle,
      borderTopWidth: 1,
      elevation: 0,
      shadowOpacity: 0,
      height: 72,
      paddingBottom: 12,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2,
    },
  };
}

export function getCalendarTokens(colorScheme?: string | null) {
  const palette = getAppTheme(colorScheme);

  return {
    confirmed: palette.accent,
    pending: palette.textSoft,
    completed: palette.success,
    selectedBg: palette.accentSoft,
    selectedText: palette.textStrong,
    today: palette.accent,
    title: palette.textStrong,
    subtitle: palette.textMuted,
    disabled: palette.textSoft,
    arrow: palette.icon,
    background: palette.surface,
  };
}
