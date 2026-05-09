import type { NotificationType } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export type CreateUserNotificationInput = {
  userId: string;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  type: NotificationType;
  link?: string | null;
};

export async function createUserNotification(input: CreateUserNotificationInput): Promise<void> {
  const prisma = getPrisma();
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      titleAr: input.titleAr ?? null,
      message: input.message,
      messageAr: input.messageAr ?? null,
      type: input.type,
      link: input.link ?? null,
    },
  });
}
