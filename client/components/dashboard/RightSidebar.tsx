import { Github, Mail, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuthStore } from '@/store/useAuthStore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IntegrationType } from '@/types';

type Provider = Exclude<IntegrationType, null>;

/**
 * True when the user's plan entitles them to integrations: pro, or an
 * active trial (mirrors the server's plan gate, see
 * featureGate.middleware.ts). Kept as a plain top level function rather than
 * inlined in the component body, so the component's render itself never
 * calls the impure Date.now directly.
 */
function isIntegrationsEntitled(
  user: { plan?: 'free' | 'pro'; trialEndsAt?: string | null } | null | undefined
): boolean {
  return (
    user?.plan === 'pro' ||
    Boolean(user?.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now())
  );
}

const PROVIDER_ICONS: Record<Provider, typeof Github> = {
  github: Github,
  notion: FileText,
  gmail: Mail,
};

const PROVIDER_LABELS: Record<Provider, string> = {
  github: 'GitHub',
  notion: 'Notion',
  gmail: 'Gmail',
};

// Fixed display order, matches the previous hardcoded rail.
const PROVIDER_ORDER: Provider[] = ['github', 'notion', 'gmail'];

export function RightSidebar() {
  const { activeIntegration, setActiveIntegration, availableProviders, connectedIntegrations, integrationsLoaded } =
    useApp();
  const user = useAuthStore((state) => state.user);
  const isEntitled = isIntegrationsEntitled(user);

  // availableProviders is genuinely empty in two different cases: still
  // loading, and a free plan user who was gated with a 403 (see
  // loadIntegrations in useStore.ts, which sets integrationsLoaded: true
  // either way). Only the first case should fall back to the hardcoded
  // order - once loading has finished, an empty array is trusted, whether
  // that is because nothing is configured or because the user is not
  // entitled. A provider with configured: false is dropped entirely once
  // loaded, since a button for a provider the server has no credentials for
  // would only ever fail.
  const providers: Provider[] = !integrationsLoaded
    ? PROVIDER_ORDER
    : isEntitled
    ? PROVIDER_ORDER.filter((provider) =>
        availableProviders.some((p) => p.provider === provider && p.configured)
      )
    : // Not entitled: keep the full rail visible in a non active state so a
      // free plan user can still discover the feature exists, rather than
      // hiding it outright.
      PROVIDER_ORDER;

  return (
    <aside className="w-14 h-screen flex flex-col items-center py-4 bg-card border-l border-border gap-2">
      {providers.map((provider) => {
        const Icon = PROVIDER_ICONS[provider];
        const label = PROVIDER_LABELS[provider];
        const isConnected = connectedIntegrations.some(
          (integration) => integration.provider === provider && integration.status === 'active'
        );

        return (
          <motion.button
            key={provider}
            onClick={() => setActiveIntegration(
              activeIntegration === provider ? null : provider
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "integration-icon relative",
              activeIntegration === provider && "active",
              !isEntitled && "opacity-40"
            )}
            title={isEntitled ? `${label}, ${isConnected ? 'connected' : 'not connected'}` : `${label}, part of Pro`}
          >
            <Icon className="w-5 h-5" />
            {isEntitled && isConnected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </motion.button>
        );
      })}
    </aside>
  );
}
