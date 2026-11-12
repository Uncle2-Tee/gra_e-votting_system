import Link from "next/link";
import { ArrowLeft, ArrowRight, Database, ShieldCheck, Trash2 } from "lucide-react";
import AdminDataRecordDeleteButton from "@/components/admin-data-record-delete-button";
import {
  ADMIN_DATA_KIND_LABELS,
  ADMIN_DATA_KINDS,
  type AdminDataPage,
} from "@/lib/admin-data-management";

function formatCreatedAt(value: string) {
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function kindUrl(kind: string, page = 1) {
  return `/admin/data?kind=${encodeURIComponent(kind)}&page=${page}`;
}

export default function AdminDataManagementPage({
  data,
}: {
  data: AdminDataPage;
}) {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          System management
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
          Delete records
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Permanently remove selected operational records. Each deletion is
          recorded in the audit history; administrator accounts, security
          records, and audit history are protected.
        </p>
      </div>

      <section className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div>
          <h2 className="text-sm font-semibold">Review linked-data effects</h2>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">
            Deletions are permanent and require confirmation. Records that
            contain voting activity may be blocked from deletion to protect
            election integrity. Delete an entire election from Voting setup to
            remove all of its linked data.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav
          aria-label="Record type"
          className="h-fit rounded-xl border border-slate-200/80 bg-white p-2"
        >
          <p className="px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Record type
          </p>
          {ADMIN_DATA_KINDS.map((kind) => (
            <Link
              key={kind}
              href={kindUrl(kind)}
              aria-current={data.kind === kind ? "page" : undefined}
              className={`mt-0.5 flex min-h-10 items-center rounded-lg px-3 text-xs font-medium transition ${
                data.kind === kind
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {ADMIN_DATA_KIND_LABELS[kind]}
            </Link>
          ))}
          <Link
            href="/admin/elections"
            className="mt-2 flex min-h-10 items-center gap-2 rounded-lg border-t border-slate-100 px-3 pt-2 text-xs font-semibold text-slate-600 hover:text-emerald-800"
          >
            Elections
            <ArrowRight className="ml-auto size-3.5" />
          </Link>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                <Database className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {ADMIN_DATA_KIND_LABELS[data.kind]}
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {data.total} {data.total === 1 ? "record" : "records"}
                  {data.databaseStatus === "connected" ? ` · Page ${data.page} of ${data.totalPages}` : ""}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-800">
              <Trash2 className="size-3" />
              Permanent deletion
            </span>
          </div>

          {data.databaseStatus === "unavailable" ? (
            <div role="alert" className="p-6 text-sm text-rose-800">
              {data.error}
            </div>
          ) : data.records.length > 0 ? (
            <>
              <ul className="divide-y divide-slate-100">
                {data.records.map((record) => (
                  <li
                    key={record.id}
                    className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {record.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-600">
                        {record.detail}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Created {formatCreatedAt(record.createdAt)}
                      </p>
                    </div>
                    <AdminDataRecordDeleteButton
                      kind={data.kind}
                      recordId={record.id}
                      title={record.title}
                    />
                  </li>
                ))}
              </ul>
              {data.totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
                  {data.page > 1 ? (
                    <Link
                      href={kindUrl(data.kind, data.page - 1)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ArrowLeft className="size-3.5" />
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  {data.page < data.totalPages ? (
                    <Link
                      href={kindUrl(data.kind, data.page + 1)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Next
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Database className="size-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                No records to delete
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                There are no {ADMIN_DATA_KIND_LABELS[data.kind].toLocaleLowerCase("en")} in the database.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
