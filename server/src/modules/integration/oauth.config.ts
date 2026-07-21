// OAuth provider configuration
// To add a new provider: add a new entry here, no controller changes needed.

import { env } from '../../config/env.ts';

interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scope: string;
    params?: Record<string, string>;
    // "body": client_id/client_secret go in the JSON/form request body (GitHub, Gmail).
    // "basic": the token endpoint requires HTTP Basic auth instead (Notion).
    authStyle: 'body' | 'basic';
}

export const OAUTH_CONFIG: Record<string, OAuthProviderConfig> = {
    gmail: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        // Read-only Gmail access plus the account profile for Zenith's integration panel
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
        params: {
            access_type: 'offline',   // ensures we get a refresh token
            prompt: 'consent',        // forces consent screen so refresh token is always returned
        },
        authStyle: 'body',
    },
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        // repo: issues + PRs; user: profile; notifications: unread count
        scope: 'repo user notifications',
        authStyle: 'body',
    },
    notion: {
        clientId: env.NOTION_CLIENT_ID,
        clientSecret: env.NOTION_CLIENT_SECRET,
        authUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        // Notion grants page access at consent time, it has no scopes
        scope: '',
        params: {
            owner: 'user',
        },
        authStyle: 'basic',
    },
};

// A provider is only safe to offer to users once both its client id and secret
// are actually configured. Notion credentials are optional (see env.ts), so this
// keeps the rest of the app from offering a provider that cannot complete OAuth.
export function isProviderConfigured(provider: string): boolean {
    const config = OAUTH_CONFIG[provider];
    if (!config) return false;
    return Boolean(config.clientId) && Boolean(config.clientSecret);
}

export const PROVIDER_LABELS: Record<string, string> = {
    github: 'GitHub',
    gmail: 'Gmail',
    notion: 'Notion',
};
