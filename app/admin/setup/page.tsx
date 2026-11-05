import { redirect } from "next/navigation";

export default function AdminSetupRedirect() {
  redirect("/admin/login");
}
