import { signIn } from "next-auth/react";

/** Always show Google’s account chooser (not silent re-use of the last account). */
export const GOOGLE_ACCOUNT_PICKER_PARAMS = {
  prompt: "select_account",
} as const;

type GoogleSignInOptions = {
  callbackUrl: string;
};

export async function signInWithGoogle({ callbackUrl }: GoogleSignInOptions): Promise<void> {
  await signIn("google", { callbackUrl }, GOOGLE_ACCOUNT_PICKER_PARAMS);
}
