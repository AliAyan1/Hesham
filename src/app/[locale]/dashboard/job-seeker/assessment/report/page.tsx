import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { getPrisma } from "@/lib/db";
import { AssessmentStatus, AssessmentType, UserRole } from "@prisma/client";
import ProfileXtReportClient from "@/components/assessment/ProfileXtReport";

export default async function AssessmentReportPage() {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== UserRole.JOBSEEKER) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const row = await prisma.assessment.findFirst({
    where: {
      userId: session.user.id,
      type: AssessmentType.GENERAL,
      status: AssessmentStatus.COMPLETED,
    },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (!row) {
    redirect("/dashboard/job-seeker/assessment");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ProfileXtReportClient assessmentId={row.id} />
    </div>
  );
}
