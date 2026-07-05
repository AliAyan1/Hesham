import { InterviewReportEmployerClient } from "./InterviewReportEmployerClient";

export default async function EmployerInterviewReportPage({
  params,
}: {
  params: Promise<{ applicationId: string; locale: string }>;
}) {
  const { applicationId } = await params;
  return (
    <div className="p-4 sm:p-6">
      <InterviewReportEmployerClient applicationId={applicationId} />
    </div>
  );
}
