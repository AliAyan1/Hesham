import { NotificationType, UserRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendTransactionalEmail } from "@/lib/email/send-transactional";

export async function notifyAdminsNewMentorApplication(params: {
  mentorName: string;
  mentorUserId: string;
}): Promise<void> {
  const prisma = getPrisma();
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true },
    take: 20,
  });
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: NotificationType.MENTOR_APPLICATION,
      title: "New mentor application",
      titleAr: "طلب مرشد جديد",
      message: `New mentor application from ${params.mentorName} — review required`,
      messageAr: `طلب مرشد جديد من ${params.mentorName} — مطلوب المراجعة`,
      link: "/dashboard/admin/mentors",
    });
    if (admin.email) {
      void sendTransactionalEmail({
        to: admin.email,
        subject: "New mentor application | طلب مرشد جديد",
        html: `<p>New mentor application from <strong>${params.mentorName}</strong>. <a href="${process.env.NEXTAUTH_URL ?? ""}/dashboard/admin/mentors">Review in admin</a></p>`,
      }).catch(() => undefined);
    }
  }
}

export async function onMentorApproved(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  void sendTransactionalEmail({
    to: params.email,
    subject: "Mentor profile approved | تمت الموافقة على ملف المرشد",
    html: `<p>Congratulations ${params.name}! Your mentor profile has been approved on QudrahTech. You can now receive session bookings.</p>`,
  }).catch(() => undefined);
  await createNotification({
    userId: params.userId,
    type: NotificationType.MENTOR_APPROVED,
    title: "Your profile is approved!",
    titleAr: "تمت الموافقة على ملفك!",
    message: "Congratulations! Your mentor profile has been approved on QudrahTech.",
    messageAr: "تهانينا! تمت الموافقة على ملفك كمرشد على قدرتك.",
    link: "/dashboard/mentor",
  });
}

export async function onMentorRejected(params: {
  userId: string;
  email: string;
  reason: string;
}): Promise<void> {
  void sendTransactionalEmail({
    to: params.email,
    subject: "Mentor application update | تحديث طلب المرشد",
    html: `<p>Your mentor application was not approved.</p><p><strong>Reason:</strong> ${params.reason}</p>`,
  }).catch(() => undefined);
  await createNotification({
    userId: params.userId,
    type: NotificationType.MENTOR_REJECTED,
    title: "Application not approved",
    titleAr: "لم تتم الموافقة على الطلب",
    message: `Your mentor application was not approved. Reason: ${params.reason}`,
    messageAr: `لم تتم الموافقة على طلب المرشد. السبب: ${params.reason}`,
    link: "/dashboard/mentor/profile",
  });
}

export async function onMentorSessionBooked(params: {
  mentorUserId: string;
  menteeUserId: string;
  mentorName: string;
  menteeName: string;
  scheduledAt: Date;
}): Promise<void> {
  const when = params.scheduledAt.toLocaleString("en-GB");
  await createNotification({
    userId: params.mentorUserId,
    type: NotificationType.MENTOR_SESSION_REQUEST,
    title: "New session request",
    titleAr: "طلب جلسة جديد",
    message: `New session request from ${params.menteeName} for ${when}`,
    messageAr: `طلب جلسة من ${params.menteeName} في ${when}`,
    link: "/dashboard/mentor/sessions",
  });
  await createNotification({
    userId: params.menteeUserId,
    type: NotificationType.MENTOR_SESSION_REQUEST,
    title: "Session request sent",
    titleAr: "تم إرسال طلب الجلسة",
    message: `Session request sent to ${params.mentorName}`,
    messageAr: `تم إرسال طلب الجلسة إلى ${params.mentorName}`,
    link: "/dashboard/job-seeker/mentors",
  });
}

export async function onMentorSessionConfirmed(params: {
  menteeUserId: string;
  mentorName: string;
  scheduledAt: Date;
  sessionId: string;
}): Promise<void> {
  const when = params.scheduledAt.toLocaleString("en-GB");
  await createNotification({
    userId: params.menteeUserId,
    type: NotificationType.MENTOR_SESSION_CONFIRMED,
    title: "Session confirmed",
    titleAr: "تم تأكيد الجلسة",
    message: `Session confirmed with ${params.mentorName} on ${when}. Join from your sessions page.`,
    messageAr: `تم تأكيد الجلسة مع ${params.mentorName} في ${when}. انضم من صفحة الجلسات.`,
    link: "/dashboard/job-seeker/sessions",
  });
}
