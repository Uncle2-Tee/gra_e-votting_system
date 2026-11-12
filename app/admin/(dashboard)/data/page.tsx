import AdminDataManagementPage from "@/components/admin-data-management-page";
import {
  getAdminDataPage,
  isAdminDataKind,
} from "@/lib/admin-data-management";

export default async function AdminDataRoute({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>;
}) {
  const query = await searchParams;
  const kind = isAdminDataKind(query.kind) ? query.kind : "voters";
  const requestedPage =
    query.page && /^\d+$/.test(query.page)
      ? Math.max(1, Number(query.page))
      : 1;
  const data = await getAdminDataPage(kind, requestedPage);

  return <AdminDataManagementPage data={data} />;
}
