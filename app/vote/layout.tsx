import type { ReactNode } from "react";
import VoterDashboardShell from "@/components/voter-dashboard-shell";

export default function VoterDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <VoterDashboardShell>{children}</VoterDashboardShell>;
}
