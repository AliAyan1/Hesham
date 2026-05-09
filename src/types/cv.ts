export type CvSkillCategory = "technical" | "soft" | "industry";

export type CvSkill = {
  name: string;
  level?: string | null;
  category?: CvSkillCategory | null;
};

export type CvLanguage = {
  language: string;
  proficiency?: string | null;
};

export type CvCertification = {
  name: string;
  organization?: string | null;
  issueDate?: string | null;
  url?: string | null;
};

export type CvExperience = {
  title: string;
  company: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  current?: boolean | null;
  description?: string | string[] | null;
};

export type CvEducation = {
  degree: string;
  field: string;
  institution: string;
  location?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  current?: boolean | null;
  grade?: string | null;
};

export type ParsedCvJson = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  summary?: string | null;
  experience?: CvExperience[] | null;
  education?: CvEducation[] | null;
  skills?: CvSkill[] | null;
  languages?: CvLanguage[] | null;
  certifications?: CvCertification[] | null;
};

