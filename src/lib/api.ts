const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend.palmpizzakitchen.com/api"
).replace(/\/$/, "");

const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const TOKEN_KEY = "palm_token";
const USER_KEY = "palm_user";

export type StoredUser = {
  id?: number | string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  image?: string | null;
  photo?: string | null;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("palm-auth-updated"));
}

export function setSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

/** Resolve menu image paths so /uploads/... works from the API host */
export function resolveMediaUrl(src: string) {
  if (!src) return src;
  if (src.startsWith("/uploads/")) return `${API_ORIGIN}${src}`;
  return src;
}

function requestUrl(path: string) {
  if (
    typeof window !== "undefined" &&
    path.startsWith("/mailbox") &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ) {
    return `${window.location.origin}/api${path}`;
  }
  return `${API_URL}${path}`;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res;
  try {
    res = await fetch(requestUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot reach the Palm Pizza API. Check your connection and that https://backend.palmpizzakitchen.com is online.",
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      `Request failed (${res.status})`;
    if (res.status === 401 && typeof window !== "undefined") {
      clearSession();
    }
    const err = new Error(message) as Error & {
      status?: number;
      data?: Record<string, unknown>;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export async function apiDownload(path: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(requestUrl(path), { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed.");
  }
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition") || "";
  const match = disp.match(/filename="?([^"]+)"?/i);
  return { blob, filename: match?.[1] || "download" };
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(requestUrl(path), {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new Error(
      "Cannot reach the upload server. Check that the backend is online and you are signed in as admin.",
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Please sign in again as admin, then try uploading.");
    }
    throw new Error(
      (data as { error?: string }).error || `Upload failed (${res.status})`,
    );
  }
  return data as T;
}
