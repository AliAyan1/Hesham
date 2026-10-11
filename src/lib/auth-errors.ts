import { CredentialsSignin } from "next-auth";

/** Thrown from credentials `authorize` when Postgres is unreachable (not wrong password). */
export class AuthDatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}
