// OAuth provider configuration
// To add a new provider: add a new entry here — no controller changes needed.

import { env } from '../../config/env.ts';

interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scope: string;
    params?: Record<string, string>;
}

export const OAUTH_CONFIG: Record<string, OAuthProviderConfig> = {
    google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        // Read-only Gmail access is enough for Zenith's integration panel
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        params: {
            access_type: 'offline',   // ensures we get a refresh token
            prompt: 'consent',        // forces consent screen so refresh token is always returned
        },
    },
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        // repo: issues + PRs; user: profile; notifications: unread count
        scope: 'repo user notifications',
    },
    // notion: {} — coming soon
};
