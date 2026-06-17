// Design tokens from /app/design_guidelines.json — "7 Dark-First Utility DARK".
export const colors = {
  surface: "#0A0B0E",
  onSurface: "#E5E7EB",
  surfaceSecondary: "#15171D",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#1F222B",
  onSurfaceTertiary: "#6B7280",
  brand: "#FF5A00",
  onBrand: "#FFFFFF",
  brandSecondary: "#D44900",
  brandTertiary: "#331604",
  onBrandTertiary: "#FF8A4C",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  border: "#272A35",
  borderStrong: "#4B5563",
  divider: "#1F222B",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const font = {
  display: "Barlow-Bold",
  displaySemi: "Barlow-Semi",
  displayMed: "Barlow-Med",
  displayReg: "Barlow-Reg",
  text: "DMSans",
};

export const POOL_ORDER = [
  "utr_3_0",
  "utr_3_5",
  "utr_4_0",
  "utr_4_5",
  "utr_5_0",
  "utr_5_5",
  "utr_6_0",
];

export const getUTRFromKey = (key: string): number =>
  parseFloat(key.replace("utr_", "").replace("_", "."));

export const TEAM_SIZE = 7;
