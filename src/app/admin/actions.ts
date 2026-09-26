"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPasscode, adminToken, passcodeMatches } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!rateLimit(`login:${ip}`, 10, 10 * 60_000).ok) return "Too many attempts. Try again in a few minutes.";
  if (!adminPasscode()) return "The review desk is not configured. Set ADMIN_PASSCODE on the server.";
  if (!passcodeMatches(String(form.get("passcode") ?? ""))) return "Incorrect passcode";
  (await cookies()).set(ADMIN_COOKIE, adminToken()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && h.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}
