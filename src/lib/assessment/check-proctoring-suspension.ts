import { isProctoringSuspended } from "@/lib/assessment/proctoring-policy";
import { getProctoringSuspensionForUser } from "@/lib/assessment/apply-proctoring-suspension";

export type ProctoringSuspensionPayload = {
  error: "proctoring_suspended";
  cooldownUntil: string;
};

export async function getProctoringSuspensionPayload(
  userId: string,
): Promise<ProctoringSuspensionPayload | null> {
  const until = await getProctoringSuspensionForUser(userId);
  if (!isProctoringSuspended(until)) return null;
  return {
    error: "proctoring_suspended",
    cooldownUntil: until!.toISOString(),
  };
}
