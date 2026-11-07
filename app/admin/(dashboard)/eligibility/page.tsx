import AdminEligibilityImport from "@/components/admin-eligibility-import";

export default function AdminEligibilityPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Voter management
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
          Eligibility &amp; imports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Register voters once. They will be eligible for all current open and upcoming elections, as well as elections created in the future.
        </p>
      </div>
      <AdminEligibilityImport />
    </main>
  );
}
