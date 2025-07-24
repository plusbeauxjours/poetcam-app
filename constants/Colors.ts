const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

interface ColorScheme {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  accent: string;
  secondaryText: string;
  border: string;
  success: string;
  successBackground: string;
  error: string;
  warning: string;
  card: string;
  surface: string;
  overlay: string;
  grey: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export const Colors: {
  light: ColorScheme;
  dark: ColorScheme;
  primary: string;
  accent: string;
  background: string;
  text: string;
  secondaryText: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  black: string;
  grey: {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
} = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    primary: "#2c3e50",
    accent: "#e6b800",
    secondaryText: "#7f8c8d",
    border: "#bdc3c7",
    success: "#27ae60",
    successBackground: "rgba(39, 174, 96, 0.1)",
    error: "#c0392b",
    warning: "#f39c12",
    card: "#ffffff",
    surface: "#f8f9fa",
    overlay: "rgba(0, 0, 0, 0.5)",
    grey: {
      50: "#f8f9fa",
      100: "#f2f2f2",
      200: "#e6e6e6",
      300: "#d9d9d9",
      400: "#b3b3b3",
      500: "#9BA1A6",
      600: "#808080",
      700: "#666666",
      800: "#4d4d4d",
      900: "#333333",
    },
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    primary: "#3498db",
    accent: "#f1c40f",
    secondaryText: "#95a5a6",
    border: "#34495e",
    success: "#2ecc71",
    successBackground: "rgba(46, 204, 113, 0.1)",
    error: "#e74c3c",
    warning: "#e67e22",
    card: "#1e1e1e",
    surface: "#2c2c2c",
    overlay: "rgba(0, 0, 0, 0.7)",
    grey: {
      50: "#2c2c2c",
      100: "#3a3a3a",
      200: "#4a4a4a",
      300: "#5a5a5a",
      400: "#6a6a6a",
      500: "#7a7a7a",
      600: "#8a8a8a",
      700: "#9a9a9a",
      800: "#aaaaaa",
      900: "#cccccc",
    },
  },
  // Backward compatibility
  primary: "#2c3e50",
  accent: "#e6b800",
  background: "#f4f4f4",
  text: "#34495e",
  secondaryText: "#7f8c8d",
  border: "#bdc3c7",
  success: "#27ae60",
  error: "#c0392b",
  warning: "#f39c12",
  black: "#333333",
  grey: {
    100: "#f2f2f2",
    200: "#e6e6e6",
    300: "#d9d9d9",
    400: "#b3b3b3",
    500: "#9BA1A6",
    600: "#808080",
    700: "#666666",
    800: "#4d4d4d",
    900: "#333333",
  },
};
