import Constants from "expo-constants";

function getDefaultApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const normalizedHostUri = hostUri.includes("://") ? hostUri : `http://${hostUri}`;
    const host = new URL(normalizedHostUri).hostname;
    return `http://${host}:8000/api`;
  }

  return "http://localhost:8000/api";
}

export const Config = {
  API_URL: getDefaultApiUrl(),
  API_TIMEOUT: 10_000,
  TOKEN_KEY: "yessal_access_token",
  REFRESH_KEY: "yessal_refresh_token",
  APP_NAME: "Yessal Gui",
} as const;
