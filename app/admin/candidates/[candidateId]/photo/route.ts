import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-security";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/candidates/[candidateId]/photo">,
) {
  const { candidateId } = await params;
  if (!UUID_PATTERN.test(candidateId)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        status: true,
        photoData: true,
        photoMimeType: true,
        election: { select: { status: true } },
      },
    });

    if (!candidate?.photoData || candidate.photoMimeType !== "image/webp") {
      return new NextResponse(null, { status: 404 });
    }

    const approvedForVoterDisplay =
      candidate.status === "APPROVED" &&
      ["SCHEDULED", "PUBLISHED", "OPEN"].includes(candidate.election.status);
    if (!approvedForVoterDisplay) {
      const admin = await getCurrentAdmin();
      if (
        !admin ||
        (admin.role !== "SUPER_ADMIN" && admin.role !== "ELECTION_ADMIN")
      ) {
        return new NextResponse(null, { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(candidate.photoData), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(candidate.photoData.byteLength),
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "UNKNOWN";
    console.error("Candidate profile photo could not be loaded.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
    return new NextResponse(null, { status: 503 });
  }
}
