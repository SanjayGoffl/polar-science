import { createHash } from "node:crypto";

export const ADMIN_COOKIE = "ncpor_admin";

export function adminPasscode() {
  return process.env.ADMIN_PASSCODE || "ncpor2026";
}

/** Cookie value: a hash of the passcode, so the passcode itself never sits in the browser. */
export function adminToken() {
  return createHash("sha256").update(`ncpor-review:${adminPasscode()}`).digest("hex");
}
