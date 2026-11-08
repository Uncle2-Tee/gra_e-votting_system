import { prisma } from "@/lib/prisma";

export default async function AdminPendingNominationBadge() {
  let count: number | null;
  try {
    count = await prisma.candidate.count({
      where: { status: "PENDING" },
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "UNKNOWN";
    console.error("Pending nomination count could not be loaded.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    count = null;
  }

  if (count === 0) {
    return null;
  }
  if (count === null) {
    return (
      <span
        aria-label="Pending nomination count unavailable"
        title="Pending nomination count unavailable"
        className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800"
      >
        —
      </span>
    );
  }

  return (
    <span
      aria-label={`${count} pending nomination approvals`}
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
