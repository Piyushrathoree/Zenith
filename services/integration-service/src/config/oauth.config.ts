import { env } from "../util/env";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  params?: Record<string, string>;
}
export const OAUTH_CONFIG: Record<string, OAuthConfig> = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,

    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",

    // Scopes for Gmail. We only want Read-Only access to be safe.
    scope: "https://www.googleapis.com/auth/gmail.readonly",

    // CRITICAL PARAMS for Google:
    // access_type: 'offline' -> Ensures we get a Refresh Token (so we can sync while user sleeps)
    // prompt: 'consent' -> Forces the consent screen, guaranteeing the Refresh Token is sent
    params: {
      access_type: "offline",
      prompt: "consent",
    },
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,

    // The URL we redirect the user to
    authUrl: "https://github.com/login/oauth/authorize",

    // The URL we call (server-to-server) to swap code for token
    tokenUrl: "https://github.com/login/oauth/access_token",

    // Scopes needed for Zenith:
    // 'repo': Access private repositories (Issues/PRs)
    // 'user': Access profile data (to display username)
    // 'notifications': Access unread notifications
    scope: "repo user notifications",
  },
};
