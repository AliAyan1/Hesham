import { CredentialsSignin } from "next-auth";

/** Thrown from credentials `authorize` when Postgres is unreachable (not wrong password). */
export class AuthDatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}

export class AuthEmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}
