import { Github, Mail, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IntegrationType } from '@/types';

type Provider = Exclude<IntegrationType, null>;

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
  // Integrations are open to every user (open source, no Pro gate). Until the provider list
  // loads, show the fixed order; after that, only providers configured on this server.
  const providers: Provider[] = !integrationsLoaded
    ? PROVIDER_ORDER
    : PROVIDER_ORDER.filter((provider) =>
        availableProviders.some((p) => p.provider === provider && p.configured)
      );

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
              activeIntegration === provider && "active"
            )}
            title={`${label}, ${isConnected ? 'connected' : 'not connected'}`}
            aria-label={`${label}, ${isConnected ? 'connected' : 'not connected'}`}
          >
            <Icon className="w-5 h-5" />
            {isConnected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
            )}
          </motion.button>
        );
      })}
    </aside>
  );
}
