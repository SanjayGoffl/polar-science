import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ncpor_admin";

/**
 * The review passcode. Production requires ADMIN_PASSCODE to be set; without it the review desk
 * stays locked. In development a local default keeps setup to zero steps.
 */
export function adminPasscode(): string | null {
  if (process.env.ADMIN_PASSCODE) return process.env.ADMIN_PASSCODE;
  return process.env.NODE_ENV === "production" ? null : "ncpor2026";
}

/** Cookie value: a hash of the passcode, so the passcode itself never sits in the browser. */
export function adminToken() {
  const pass = adminPasscode();
  return pass ? createHash("sha256").update(`ncpor-review:${pass}`).digest("hex") : null;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passcodeMatches(input: string) {
  const pass = adminPasscode();
  return !!pass && safeEqual(input, pass);
}

export async function isAdmin() {
  const token = adminToken();
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!token && !!v && safeEqual(v, token);
}
