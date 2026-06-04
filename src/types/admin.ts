export type AdminOverviewStats = {
  totalUsers: number;
  newUsersToday: number;
  activeJobs: number;
  jobsPostedToday: number;
  totalRevenue: number;
  revenueThisMonth: number;
  successfulHires: number;
  hiresThisMonth: number;
  jobSeekers: { total: number; free: number; pro: number; premium: number };
  employers: { total: number; active: number; inactive: number };
  assessments: { completed: number; flagged: number; inProgress: number };
  interviews: { completed: number; flagged: number };
};

export type AdminGrowthPoint = {
  date: string;
  jobSeekers: number;
  employers: number;
  mentors: number;
};

export type AdminRevenueMonth = {
  month: string;
  subscriptions: number;
  recruitmentFees: number;
  mentorSessions: number;
};

export type AdminScoreBucket = {
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export type AdminApplicationStatusBar = {
  status: string;
  count: number;
  color: string;
};

export type PendingMentorRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  expertise: string[];
  industries: string[];
  appliedAt: string;
};

export type FlaggedAssessmentRow = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  completedAt: string | null;
  flagReason: string | null;
  flagCount: number;
  overallScore: number | null;
};

export type FlaggedInterviewRow = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  completedAt: string | null;
  flagReason: string | null;
  flagCount: number;
};

export type PendingPayoutRow = {
  id: string;
  mentorId: string;
  name: string | null;
  image: string | null;
  sessionsCount: number;
  amount: number;
  bankName: string;
  iban: string;
  requestedAt: string;
};

export type AdminActivityItem = {
  id: string;
  emoji: string;
  message: string;
  createdAt: string;
};

export type AdminStatsPayload = {
  overview: AdminOverviewStats;
  userGrowth: AdminGrowthPoint[];
  revenueByMonth: AdminRevenueMonth[];
  scoreDistribution: AdminScoreBucket[];
  applicationsByStatus: AdminApplicationStatusBar[];
  pendingMentors: PendingMentorRow[];
  flaggedAssessments: FlaggedAssessmentRow[];
  flaggedInterviews: FlaggedInterviewRow[];
  pendingPayouts: PendingPayoutRow[];
  pendingPayoutsTotal: number;
  activity: AdminActivityItem[];
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  subscriptionTier: string;
  assessmentScore: number | null;
  applicationsCount: number;
  jobsPostedCount: number;
  joinedAt: string;
  status: "ACTIVE" | "SUSPENDED";
};

export type AdminUsersListPayload = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: Record<string, number>;
};

export type AdminAssessmentRow = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  score: number | null;
  status: string;
  flagCount: number;
  completedAt: string | null;
  duration: number | null;
  isFlagged: boolean;
  proctoringFlags: unknown;
};

export type AdminRevenuePayload = {
  totalAllTime: number;
  thisMonth: number;
  lastMonth: number;
  growthPercent: number;
  breakdown: {
    subscriptions: { amount: number; percent: number };
    recruitmentFees: { amount: number; percent: number };
    mentorSessions: { amount: number; percent: number };
  };
  monthlyChart: AdminRevenueMonth[];
  transactions: AdminTransactionRow[];
};

export type AdminTransactionRow = {
  id: string;
  date: string;
  type: "SUBSCRIPTION" | "RECRUITMENT" | "SESSION";
  partyName: string;
  amount: number;
  vat: number;
  total: number;
  status: string;
};

export type AdminAuditRow = {
  id: string;
  timestamp: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: string;
  ipAddress: string | null;
  status: "success" | "failed" | "warning";
};

export type AdminTalentPoolRow = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  email: string;
  assessmentScore: number | null;
  skills: string[];
  category: string;
  reason: string;
  addedAt: string;
  progressPercent: number;
};

export type AdminTalentPoolPayload = {
  summary: {
    total: number;
    addedThisWeek: number;
    exitedImproved: number;
    averageScore: number;
  };
  items: AdminTalentPoolRow[];
};
