import { api, setSession, type StoredUser } from "@/lib/api";

/** Strip hidden phone-keyboard characters phones often insert into email fields. */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** Trim password manager / iOS trailing spaces without changing the real password. */
export function normalizePassword(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    .trim();
}

export type LoginUser = StoredUser & { role?: string; email?: string; name?: string };

export type LoginResult = {
  token: string;
  user: LoginUser;
};

export async function loginWithCredentials(
  email: string,
  password: string,
  options?: { requireAdmin?: boolean },
): Promise<LoginResult> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail) {
    throw new Error("Enter your email address.");
  }
  if (!normalizedPassword) {
    throw new Error("Enter your password.");
  }

  const data = await api<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  });

  if (!data?.token || !data?.user) {
    throw new Error("Sign-in did not complete. Try again.");
  }

  if (options?.requireAdmin && data.user.role !== "admin") {
    throw new Error(
      "This account is not a shop manager. Use the admin email and password.",
    );
  }

  setSession(data.token, data.user);
  return data;
}
