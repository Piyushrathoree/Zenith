import { Github, Mail, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IntegrationType } from '@/types';

export function RightSidebar() {
  const { activeIntegration, setActiveIntegration } = useApp();

  const integrations: { id: IntegrationType; icon: typeof Github; label: string }[] = [
    { id: 'github', icon: Github, label: 'GitHub' },
    { id: 'notion', icon: FileText, label: 'Notion' },
    { id: 'gmail', icon: Mail, label: 'Gmail' },
  ];

  return (
    <aside className="w-14 h-screen flex flex-col items-center py-4 bg-card border-l border-border gap-2">
      {integrations.map((integration) => (
        <motion.button
          key={integration.id}
          onClick={() => setActiveIntegration(
            activeIntegration === integration.id ? null : integration.id
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "integration-icon",
            activeIntegration === integration.id && "active"
          )}
          title={integration.label}
        >
          <integration.icon className="w-5 h-5" />
        </motion.button>
      ))}
    </aside>
  );
}
