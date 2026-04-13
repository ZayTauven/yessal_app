// constants/colors.ts
export const Colors = {
  accent: {
    DEFAULT: "#1A5C3A",
    light: "#2D7A4F",
    lighter: "#3D9A64",
    dim: "#1A5C3A1A",
  },
  gold: {
    DEFAULT: "#B8860B",
    light: "#D4A017",
  },
  surface: {
    DEFAULT: "#FFFFFF",
    muted: "#F4F2EE",
    subtle: "#FAFAF8",
    dark: "#0E1810",
    card: "#1A2B1E",
  },
  ink: {
    DEFAULT: "#1C1C1A",
    muted: "#6B6B65",
    faint: "#A8A8A2",
    ghost: "#D4D4CE",
  },
  border: {
    DEFAULT: "rgba(28,28,26,0.10)",
    medium: "rgba(28,28,26,0.18)",
    dark: "#2A3D30",
  },
  status: {
    success: "#2D6A4F",
    warning: "#92620A",
    error: "#8B2E2E",
    info: "#1C4E7A",
  },
} as const;
