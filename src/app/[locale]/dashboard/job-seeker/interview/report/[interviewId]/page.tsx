import { JobSeekerInterviewReportClient } from "./JobSeekerInterviewReportClient";

export default async function JobSeekerInterviewReportPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  return (
    <div className="p-4 sm:p-6">
      <JobSeekerInterviewReportClient interviewId={interviewId} />
    </div>
  );
}
