/** Default fields when creating a new Mentor row (DB-safe). */
export const defaultMentorProfileCreate = {
  title: null as string | null,
  expertise: [] as string[],
  industries: [] as string[],
  languages: [
    { name: "Arabic", level: "Native" },
    { name: "English", level: "Professional" },
  ],
};
