/** Mask salary fields for public / job-seeker facing payloads. */
export function maskSalaryIfHidden<
  T extends {
    salaryMin?: number | null;
    salaryMax?: number | null;
    hideSalary?: boolean | null;
  },
>(job: T): T {
  if (!job.hideSalary) return job;
  return {
    ...job,
    salaryMin: null,
    salaryMax: null,
  };
}
