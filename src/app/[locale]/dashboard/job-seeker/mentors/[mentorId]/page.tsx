import MentorBookClient from "./MentorBookClient";

export default async function MentorBookPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  return <MentorBookClient mentorId={mentorId} />;
}
