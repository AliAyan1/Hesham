import type { ReactElement } from "react";
import { ApplicationStatus, NotificationType, UserRole } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { getPrisma } from "@/lib/db";
import { WelcomeJobSeeker } from "@/emails/WelcomeJobSeeker";
import { WelcomeEmployer } from "@/emails/WelcomeEmployer";
import { AssessmentInvite } from "@/emails/AssessmentInvite";
import { AssessmentComplete } from "@/emails/AssessmentComplete";
import { AssessmentFailed } from "@/emails/AssessmentFailed";
import { NewJobMatch } from "@/emails/NewJobMatch";
import { ApplicationConfirmed } from "@/emails/ApplicationConfirmed";
import { ApplicationStatus as ApplicationStatusEmail } from "@/emails/ApplicationStatus";
import { InterviewInvitation } from "@/emails/InterviewInvitation";
import { InterviewCompleteCandidate } from "@/emails/InterviewCompleteCandidate";
import { InterviewCompleteEmployer } from "@/emails/InterviewCompleteEmployer";
import { NewApplication } from "@/emails/NewApplication";
import { TalentPoolAdded } from "@/emails/TalentPoolAdded";
import { TalentPoolNominated } from "@/emails/TalentPoolNominated";
import { OfferLetterReceived } from "@/emails/OfferLetterReceived";
import { ObligationLetterEmail } from "@/emails/ObligationLetter";
import { PaymentConfirmed } from "@/emails/PaymentConfirmed";
import { NewMessage } from "@/emails/NewMessage";
import { ProfileReminder } from "@/emails/ProfileReminder";
import { PasswordReset } from "@/emails/PasswordReset";
import { appUrl } from "@/lib/email/app-url";

async function safeSend(to: string, subject: string, template: ReactElement): Promise<void> {
  try {
    await sendEmail({ to, subject, template });
  } catch {
    /* non-blocking */
  }
}

export async function onJobSeekerRegistered(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  const prisma = getPrisma();
  await safeSend(
    params.email,
    "Welcome to QudrahTech! | مرحباً بك في قدرتك",
    WelcomeJobSeeker({ name: params.name || "there" }),
  );
  await createNotification({
    userId: params.userId,
    type: NotificationType.ASSESSMENT_INVITE,
    title: "Complete your AI assessment",
    titleAr: "أكمل تقييمك الذكي",
    message: "Welcome! Complete your assessment to unlock applications.",
    messageAr: "مرحباً! أكمل تقييمك لفتح التقديم على الوظائف.",
    link: "/dashboard/job-seeker/assessment",
  });
  await prisma.user.update({
    where: { id: params.userId },
    data: { welcomeEmailSentAt: new Date() },
  });
  await logAudit({ userId: params.userId, action: "user.registered", entity: "User", entityId: params.userId });
}

export async function onEmployerRegistered(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  await safeSend(
    params.email,
    "Welcome to QudrahTech! Start Hiring Smarter",
    WelcomeEmployer({ name: params.name || "there" }),
  );
  await logAudit({ userId: params.userId, action: "user.registered", entity: "User", entityId: params.userId });
}

/** Call from hourly cron for users registered ~1h ago without assessment invite email. */
export async function onAssessmentInviteDelayed(params: {
  userId: string;
  email: string;
  name: string;
}): Promise<void> {
  await safeSend(
    params.email,
    "Complete Your AI Assessment | أكمل تقييمك",
    AssessmentInvite({ name: params.name || "there" }),
  );
}

export async function onAssessmentComplete(params: {
  userId: string;
  email: string;
  name: string;
  score: number;
  strengths?: Array<{ title?: string }>;
}): Promise<void> {
  const passed = params.score >= 50;
  const s1 = params.strengths?.[0]?.title;
  const s2 = params.strengths?.[1]?.title;

  if (passed) {
    await safeSend(
      params.email,
      "Your Assessment Results are Ready! | نتائجك جاهزة",
      AssessmentComplete({ name: params.name || "there", score: params.score, strength1: s1, strength2: s2 }),
    );
    await createNotification({
      userId: params.userId,
      type: NotificationType.ASSESSMENT_COMPLETE,
      title: "Assessment Complete!",
      titleAr: "اكتمل التقييم!",
      message: `Your score: ${params.score}/100`,
      messageAr: `درجتك: ${params.score}/100`,
      link: "/dashboard/job-seeker/assessment",
    });
  } else {
    await safeSend(
      params.email,
      "Keep Going! Retake Your Assessment",
      AssessmentFailed({ name: params.name || "there", score: params.score, tip: "Focus on communication and clarity." }),
    );
  }
  await logAudit({
    userId: params.userId,
    action: "assessment.completed",
    entity: "Assessment",
    newData: { score: params.score, passed },
  });
}

export async function onApplicationSubmitted(params: {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  seekerId: string;
  seekerEmail: string;
  seekerName: string;
  employerId: string;
  employerEmail: string;
  assessmentScore?: number | null;
}): Promise<void> {
  const appliedAt = new Date().toLocaleDateString("en-GB");
  await safeSend(
    params.seekerEmail,
    "Application Submitted! | تم إرسال طلبك",
    ApplicationConfirmed({ jobTitle: params.jobTitle, company: params.company, appliedAt }),
  );
  await createNotification({
    userId: params.seekerId,
    type: NotificationType.APPLICATION_UPDATE,
    title: "Application submitted",
    titleAr: "تم إرسال الطلب",
    message: `${params.jobTitle} at ${params.company}`,
    messageAr: `${params.jobTitle} — ${params.company}`,
    link: "/dashboard/job-seeker/applications",
  });

  await safeSend(
    params.employerEmail,
    "New Application Received | طلب جديد",
    NewApplication({
      candidateName: params.seekerName,
      jobTitle: params.jobTitle,
      assessmentScore: params.assessmentScore,
      applicationId: params.applicationId,
    }),
  );
  await createNotification({
    userId: params.employerId,
    type: NotificationType.NEW_APPLICATION,
    title: "New application",
    titleAr: "طلب جديد",
    message: `${params.seekerName} applied for ${params.jobTitle}`,
    messageAr: `تقدم ${params.seekerName} على ${params.jobTitle}`,
    link: `/dashboard/employer/candidates/${params.applicationId}`,
  });
  await logAudit({
    userId: params.seekerId,
    action: "application.submitted",
    entity: "Application",
    entityId: params.applicationId,
  });
}

export async function onApplicationStatusChanged(params: {
  applicationId: string;
  seekerId: string;
  seekerEmail: string;
  jobTitle: string;
  status: ApplicationStatus;
  declineReason?: string | null;
}): Promise<void> {
  let messageEn = `Your application is now ${params.status}.`;
  let messageAr = `حالة طلبك الآن: ${params.status}.`;
  if (params.status === ApplicationStatus.SHORTLISTED) {
    messageEn = "Congratulations! You have been shortlisted.";
    messageAr = "تهانينا! تم اختيارك في القائمة المختصرة.";
  } else if (params.status === ApplicationStatus.REJECTED) {
    messageEn = "Thank you for applying. Unfortunately we cannot proceed at this time.";
    messageAr = "شكراً لتقديمك. للأسف لا يمكننا المتابعة حالياً.";
  } else if (params.status === ApplicationStatus.HIRED) {
    messageEn = "Congratulations! You have been hired.";
    messageAr = "تهانينا! تم توظيفك.";
  }

  await safeSend(
    params.seekerEmail,
    "Update on Your Application | تحديث على طلبك",
    ApplicationStatusEmail({
      jobTitle: params.jobTitle,
      status: params.status,
      messageEn,
      messageAr,
      declineReason: params.declineReason ?? undefined,
    }),
  );
  await createNotification({
    userId: params.seekerId,
    type: NotificationType.APPLICATION_UPDATE,
    title: "Application Updated",
    titleAr: "تم تحديث طلبك",
    message: messageEn,
    messageAr,
    link: "/dashboard/job-seeker/applications",
  });
  await logAudit({
    userId: params.seekerId,
    action: "application.status_changed",
    entity: "Application",
    entityId: params.applicationId,
    newData: { status: params.status },
  });
}

export async function onInterviewInvitation(params: {
  seekerId: string;
  seekerEmail: string;
  jobTitle: string;
  company: string;
  jobId: string;
}): Promise<void> {
  await safeSend(
    params.seekerEmail,
    "You Have a Video Interview! | لديك مقابلة فيديو",
    InterviewInvitation({ jobTitle: params.jobTitle, company: params.company, interviewId: params.jobId }),
  );
  await createNotification({
    userId: params.seekerId,
    type: NotificationType.INTERVIEW_INVITED,
    title: "Video Interview Waiting",
    titleAr: "مقابلة فيديو بانتظارك",
    message: `Complete your interview for ${params.jobTitle}`,
    messageAr: `أكمل مقابلتك لوظيفة ${params.jobTitle}`,
    link: "/dashboard/job-seeker/interview",
  });
}

export async function onInterviewComplete(params: {
  seekerId: string;
  seekerEmail: string;
  seekerName: string;
  score: number;
  employerId?: string;
  employerEmail?: string;
  applicationId?: string;
}): Promise<void> {
  await safeSend(
    params.seekerEmail,
    "Interview Complete! | اكتملت مقابلتك",
    InterviewCompleteCandidate({ score: params.score }),
  );
  await createNotification({
    userId: params.seekerId,
    type: NotificationType.INTERVIEW_COMPLETE,
    title: "Interview Results Ready",
    titleAr: "نتائج المقابلة جاهزة",
    message: "View your interview score and feedback",
    messageAr: "اعرض درجة مقابلتك والملاحظات",
    link: "/dashboard/job-seeker/interview",
  });

  if (params.applicationId && params.employerEmail) {
    await safeSend(
      params.employerEmail,
      "Candidate Interview Ready to Review",
      InterviewCompleteEmployer({
        candidateName: params.seekerName,
        score: params.score,
        applicationId: params.applicationId,
      }),
    );
  }
  await logAudit({
    userId: params.seekerId,
    action: "interview.completed",
    entity: "VideoInterview",
    newData: { score: params.score },
  });
}

export async function onTalentPoolAdded(params: {
  userId: string;
  email: string;
  name: string;
  reason: string;
}): Promise<void> {
  await safeSend(
    params.email,
    "You Are in Our Talent Pool | أنت في مجموعة المواهب",
    TalentPoolAdded({ name: params.name, reason: params.reason }),
  );
  await createNotification({
    userId: params.userId,
    type: NotificationType.TALENT_POOL_ACTIVE,
    title: "Added to talent pool",
    titleAr: "أُضيفت إلى مجموعة المواهب",
    message: params.reason,
    messageAr: params.reason,
    link: "/dashboard/job-seeker/profile",
  });
}

export async function onTalentPoolNominated(params: {
  userId: string;
  email: string;
  company: string;
  jobTitle: string;
}): Promise<void> {
  await safeSend(
    params.email,
    "An Employer is Interested in You! | صاحب عمل مهتم بك",
    TalentPoolNominated({ company: params.company, jobTitle: params.jobTitle }),
  );
  await createNotification({
    userId: params.userId,
    type: NotificationType.TALENT_POOL_NOMINATED,
    title: "Employer Interested in You!",
    titleAr: "صاحب عمل مهتم بك!",
    message: `${params.company} nominated you for ${params.jobTitle}`,
    messageAr: `${params.company} رشّحك لوظيفة ${params.jobTitle}`,
    link: "/dashboard/job-seeker/invites",
  });
}

export async function onOfferCreated(params: {
  offerId: string;
  candidateId: string;
  candidateEmail: string;
  employerId: string;
  company: string;
  jobTitle: string;
  obligationId?: string;
  candidateName: string;
  fee: number;
  currency: string;
  employerEmail: string;
}): Promise<void> {
  await safeSend(
    params.candidateEmail,
    "You Have Received a Job Offer! | لديك عرض عمل",
    OfferLetterReceived({ company: params.company, jobTitle: params.jobTitle, offerId: params.offerId }),
  );
  await createNotification({
    userId: params.candidateId,
    type: NotificationType.OFFER_RECEIVED,
    title: "Job Offer Received! 🎉",
    titleAr: "تلقيت عرض عمل! 🎉",
    message: `${params.company} has sent you an offer`,
    messageAr: `أرسل لك ${params.company} عرض عمل`,
    link: `/dashboard/job-seeker/offers/${params.offerId}`,
  });

  if (params.obligationId) {
    await safeSend(
      params.employerEmail,
      "Sign Your Obligation Letter | وقّع خطاب الالتزام",
      ObligationLetterEmail({
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        fee: params.fee,
        currency: params.currency,
        obligationId: params.obligationId,
      }),
    );
  }
}

export async function onPaymentConfirmed(params: {
  employerId: string;
  employerEmail: string;
  amount: number;
  currency: string;
  jobTitle: string;
  receiptNumber: string;
}): Promise<void> {
  await safeSend(
    params.employerEmail,
    "Payment Confirmed | تم تأكيد الدفع",
    PaymentConfirmed({
      amount: params.amount,
      currency: params.currency,
      jobTitle: params.jobTitle,
      receiptNumber: params.receiptNumber,
    }),
  );
  await logAudit({
    userId: params.employerId,
    action: "payment.confirmed",
    entity: "RecruitmentPayment",
    newData: { receiptNumber: params.receiptNumber },
  });
}

export async function onNewMessage(params: {
  recipientId: string;
  recipientEmail: string;
  recipientRole: UserRole;
  senderName: string;
  preview: string;
  threadId: string;
}): Promise<void> {
  const role = params.recipientRole === UserRole.EMPLOYER ? "EMPLOYER" : "JOBSEEKER";
  await safeSend(
    params.recipientEmail,
    "New Message on QudrahTech | رسالة جديدة",
    NewMessage({
      senderName: params.senderName,
      preview: params.preview,
      threadId: params.threadId,
      role,
    }),
  );
  await createNotification({
    userId: params.recipientId,
    type: NotificationType.MESSAGE_RECEIVED,
    title: "New Message",
    titleAr: "رسالة جديدة",
    message: `From ${params.senderName}`,
    messageAr: `من ${params.senderName}`,
    link:
      role === "EMPLOYER"
        ? `/dashboard/employer/messages?thread=${params.threadId}`
        : `/dashboard/job-seeker/messages?thread=${params.threadId}`,
  });
}

export async function onJobMatchNotify(params: {
  userId: string;
  email: string;
  jobId: string;
  jobTitle: string;
  company: string;
  matchPercent: number;
}): Promise<void> {
  await safeSend(
    params.email,
    "New Job Match for You! | وظيفة جديدة تناسبك",
    NewJobMatch({
      jobTitle: params.jobTitle,
      company: params.company,
      matchPercent: params.matchPercent,
    }),
  );
  await createNotification({
    userId: params.userId,
    type: NotificationType.JOB_MATCH,
    title: "New Job Match!",
    titleAr: "وظيفة جديدة تناسبك!",
    message: `${params.jobTitle} at ${params.company} — ${params.matchPercent}% match`,
    messageAr: `${params.jobTitle} — ${params.company} — ${params.matchPercent}%`,
    link: `/dashboard/job-seeker/jobs/${params.jobId}`,
  });
}

export async function onPasswordReset(params: { email: string; token: string }): Promise<void> {
  const resetUrl = appUrl(`/auth/reset-password?token=${encodeURIComponent(params.token)}`);
  await safeSend(
    params.email,
    "Reset Your Password | إعادة تعيين كلمة المرور",
    PasswordReset({ resetUrl }),
  );
}

export async function runProfileReminderCron(): Promise<number> {
  const prisma = getPrisma();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const seekers = await prisma.user.findMany({
    where: {
      role: UserRole.JOBSEEKER,
      OR: [{ profileReminderSentAt: null }, { profileReminderSentAt: { lt: weekAgo } }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      cv: { select: { completionPct: true, isComplete: true } },
    },
    take: 200,
  });

  let sent = 0;
  for (const u of seekers) {
    const pct = u.cv?.completionPct ?? 0;
    if (pct >= 80) continue;
    await safeSend(
      u.email,
      "Complete Your Profile | أكمل ملفك الشخصي",
      ProfileReminder({
        name: u.name ?? "there",
        completionPct: pct,
        missingItems: "profile, CV, skills",
      }),
    );
    await prisma.user.update({
      where: { id: u.id },
      data: { profileReminderSentAt: new Date() },
    });
    sent += 1;
  }
  return sent;
}
