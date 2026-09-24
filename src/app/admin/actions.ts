"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPasscode, adminToken } from "@/lib/admin";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (String(form.get("passcode") ?? "") !== adminPasscode()) return "Incorrect passcode";
  (await cookies()).set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}
