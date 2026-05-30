import type { UserRole } from "@prisma/client";

type ProfileSlice = {
  bio?: string | null;
  location?: string | null;
  skills?: unknown;
  phone?: string | null;
};

type UserLike = {
  id: string;
  name?: string | null;
  image?: string | null;
  role?: UserRole | string;
  email?: string | null;
  profile?: ProfileSlice | null;
};

export type PublicUser = {
  id: string;
  name: string | null;
  image: string | null;
  role?: UserRole | string;
  profile?: {
    bio: string | null;
    location: string | null;
    skills: unknown;
  };
};

export type EmployerVisibleUser = PublicUser & {
  email?: string;
  phone?: string | null;
};

export function sanitizeUserForPublic(user: UserLike): PublicUser {
  return {
    id: user.id,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role,
    profile: {
      bio: user.profile?.bio ?? null,
      location: user.profile?.location ?? null,
      skills: user.profile?.skills ?? null,
    },
  };
}

export function sanitizeUserForEmployer(user: UserLike, isHired: boolean): EmployerVisibleUser {
  const base = sanitizeUserForPublic(user);
  if (isHired) {
    return {
      ...base,
      email: user.email ?? undefined,
      phone: user.profile?.phone ?? null,
    };
  }
  return base;
}
