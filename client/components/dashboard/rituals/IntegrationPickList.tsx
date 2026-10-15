import type { ReactNode } from "react";
import { FileText, Github, Mail } from "lucide-react";
import { useStore } from "@/store/useStore";
import { itemKey, itemTitle, sourceOf, taskKey, type IntegrationItem } from "@/lib/integrationTasks";
import { EmptyLine, SectionTitle } from "./RitualParts";

const ICONS = { github: Github, gmail: Mail, notion: FileText } as const;

/**
 * Integration items not yet planned, for the "pull in" steps of the rituals. Each row renders the
 * caller's actions (for example "+ Today", or one chip per day of the week).
 */
export function IntegrationPickList({
  renderActions,
  limit = 12,
}: {
  renderActions: (item: IntegrationItem) => ReactNode;
  limit?: number;
}) {
  const githubIssues = useStore((state) => state.githubIssues);
  const githubPRs = useStore((state) => state.githubPRs);
  const gmailMessages = useStore((state) => state.gmailMessages);
  const notionPages = useStore((state) => state.notionPages);
  const tasks = useStore((state) => state.tasks);
  const backlogTasks = useStore((state) => state.backlogTasks);

  const planned = new Set([...tasks, ...backlogTasks].map(taskKey).filter((key): key is string => key !== null));
  const items: IntegrationItem[] = [
    ...githubIssues.map((data) => ({ type: "github-issue" as const, data })),
    ...githubPRs.map((data) => ({ type: "github-pr" as const, data })),
    ...gmailMessages.map((data) => ({ type: "gmail" as const, data })),
    ...notionPages.map((data) => ({ type: "notion" as const, data })),
  ].filter((item) => !planned.has(itemKey(item)));

  if (githubIssues.length + githubPRs.length + gmailMessages.length + notionPages.length === 0) return null;

  return (
    <div>
      <SectionTitle>From your integrations</SectionTitle>
      <div className="space-y-2">
        {items.length === 0 && <EmptyLine>Everything from your integrations is planned.</EmptyLine>}
        {items.slice(0, limit).map((item) => {
          const Icon = ICONS[sourceOf(item)];
          return (
            <div key={itemKey(item)} className="space-y-1 rounded-lg bg-muted/30 px-3 py-2">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{itemTitle(item)}</span>
              </p>
              <div className="flex flex-wrap justify-end gap-1">{renderActions(item)}</div>
            </div>
          );
        })}
        {items.length > limit && <EmptyLine>and {items.length - limit} more in the integration panel.</EmptyLine>}
      </div>
    </div>
  );
}
