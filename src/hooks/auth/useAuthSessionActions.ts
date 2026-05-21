import {
  signInWithGoogleOAuth,
  signInWithPasswordCredentials,
  signUpWithPasswordCredentials,
} from "@/services/auth/auth-session-service";

export function useAuthSessionActions() {
  return {
    signInWithGoogleOAuth,
    signInWithPasswordCredentials,
    signUpWithPasswordCredentials,
  };
}
