import type { NotificationType } from "@prisma/client";
import { createUserNotification } from "@/lib/notifications/create-user-notification";

export type NotificationInput = {
  userId: string;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  type: NotificationType;
  link?: string | null;
};

/** Creates an in-app notification (alias used by email triggers). */
export async function createNotification(input: NotificationInput): Promise<void> {
  await createUserNotification(input);
}

export { createUserNotification };
