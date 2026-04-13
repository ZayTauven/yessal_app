import * as SecureStore from "expo-secure-store";

import { Config } from "@/constants/configs";

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

type ApiOptions = {
  auth?: boolean;
  retryOn401?: boolean;
};

type RequestInitWithJson = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let refreshPromise: Promise<string | null> | null = null;

const baseUrl = Config.API_URL.replace(/\/+$/, "");

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${normalizedPath}`;
}

function toHeaders(headers?: HeadersInit) {
  const next = new Headers(headers);
  next.set("Content-Type", "application/json");
  return next;
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function extractErrorMessage(payload: any, fallback: string) {
  return (
    payload?.detail ||
    payload?.message ||
    payload?.non_field_errors?.[0] ||
    payload?.error ||
    fallback
  );
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = await SecureStore.getItemAsync(Config.REFRESH_KEY);
      if (!refresh) {
        return null;
      }

      const response = await fetch(buildUrl("auth/refresh/"), {
        method: "POST",
        headers: toHeaders(),
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await readResponse<{ access?: string }>(response);
      const access = data?.access ?? null;
      if (access) {
        await SecureStore.setItemAsync(Config.TOKEN_KEY, access);
      }
      return access;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInitWithJson = {},
  apiOptions: ApiOptions = {},
): Promise<T> {
  const { auth = true, retryOn401 = true } = apiOptions;
  const { body, headers: requestHeaders, ...init } = options;
  const headers = toHeaders(requestHeaders);

  if (auth) {
    const token = await SecureStore.getItemAsync(Config.TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = toHeaders(requestHeaders);
      retryHeaders.set("Authorization", `Bearer ${refreshed}`);
      const retryResponse = await fetch(buildUrl(path), {
        ...init,
        headers: retryHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (retryResponse.ok) {
        return readResponse<T>(retryResponse);
      }

      const errorPayload = await readResponse<any>(retryResponse).catch(() => ({}));
      throw new ApiError(
        extractErrorMessage(errorPayload, `HTTP ${retryResponse.status}`),
        retryResponse.status,
        errorPayload?.code,
        errorPayload,
      );
    }

    await SecureStore.deleteItemAsync(Config.TOKEN_KEY);
    await SecureStore.deleteItemAsync(Config.REFRESH_KEY);
  }

  if (!response.ok) {
    const errorPayload = await readResponse<any>(response).catch(() => ({}));
    throw new ApiError(
      extractErrorMessage(errorPayload, `HTTP ${response.status}`),
      response.status,
      errorPayload?.code,
      errorPayload,
    );
  }

  return readResponse<T>(response);
}

const api = {
  get: <T,>(path: string, options?: ApiOptions) => request<T>(path, { method: "GET" }, options),
  post: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "POST", body }, options),
  put: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "PUT", body }, options),
  patch: <T,>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { method: "PATCH", body }, options),
  delete: <T,>(path: string, options?: ApiOptions) => request<T>(path, { method: "DELETE" }, options),
};

export default api;
export { request };
