import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ncpor_admin";

export function adminPasscode() {
  return process.env.ADMIN_PASSCODE || "ncpor2026";
}

/** Cookie value: a hash of the passcode, so the passcode itself never sits in the browser. */
export function adminToken() {
  return createHash("sha256").update(`ncpor-review:${adminPasscode()}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passcodeMatches(input: string) {
  return safeEqual(input, adminPasscode());
}

export async function isAdmin() {
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!v && safeEqual(v, adminToken());
}
