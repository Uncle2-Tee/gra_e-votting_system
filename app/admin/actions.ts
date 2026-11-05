"use server";

import { redirect } from "next/navigation";
import { revokeCurrentAdminSession } from "@/lib/admin-security";

export async function signOutAdmin() {
  await revokeCurrentAdminSession();
  redirect("/admin/login");
}
