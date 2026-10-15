import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { GitHubIssueCard } from "./integration/GitHubIssueCard";
import { GitHubPRCard } from "./integration/GitHubPRCard";
import { GmailCard } from "./integration/GmailCard";
import { NotionCard } from "./integration/NotionCard";
import { IntegrationItemActions } from "./integration/IntegrationItemActions";
import { IntegrationConfigure } from "./integration/IntegrationConfigure";
import { RefreshCw, Settings2, X, Github, Mail, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { safeFormatDistanceToNow } from "@/lib/formatDate";
import type { IntegrationErrorCode, IntegrationProvider } from "@/lib/api/integrations";
import type { IntegrationItem } from "@/lib/integrationTasks";

/**
 * Per provider copy and icon used by the connect prompt and the empty but
 * connected state below. Kept in one place so the two states read as one
 * voice instead of being written twice.
 */
const PROVIDER_META: Record<
  IntegrationProvider,
  { label: string; icon: typeof Github; connectDescription: string; emptyMessage: string }
> = {
  github: {
    label: "GitHub",
    icon: Github,
    connectDescription:
      "Pulls in issues and pull requests assigned to you, ones you opened, and review requests. Add them to your day with one click.",
    emptyMessage: "No issues or pull requests to show right now.",
  },
  gmail: {
    label: "Gmail",
    icon: Mail,
    connectDescription:
      "Pulls in your inbox (or starred, unread, or a label). Turn an email into a task with one click.",
    emptyMessage: "No messages to show right now.",
  },
  notion: {
    label: "Notion",
    icon: FileText,
    connectDescription:
      "Pulls in recent pages or rows from the databases you pick. Plan them like any task.",
    emptyMessage: "No pages to show right now.",
  },
};

/** Centered, calm prompt shown when the active provider has never been connected. */
function IntegrationConnectPrompt({
  provider,
  onConnect,
}: {
  provider: IntegrationProvider;
  onConnect: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft shadow-inset-soft">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          Connect {meta.label}
        </h3>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          {meta.connectDescription}
        </p>
      </div>
      <Button size="sm" onClick={onConnect}>
        Connect {meta.label}
      </Button>
    </div>
  );
}

/**
 * Quiet inline notice used for two states that share the same calm, non
 * alarming visual language: a provider whose last items fetch failed, and a
 * provider whose entry exists but is no longer active (expired or revoked).
 * Both point at the same fix, reconnecting, so they read as one voice.
 */
function IntegrationInlineNotice({
  title,
  message,
  actionLabel,
  onAction,
  link,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  link?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 shadow-inset-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{title}</p>
        {actionLabel && onAction && (
          <Button variant="ghost" size="sm" onClick={onAction} className="h-7 px-2 text-xs shrink-0">
            {actionLabel}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
      {link && (
        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline underline-offset-2">
          {link.label}
        </a>
      )}
    </div>
  );
}

/** Muted line for the normal, connected, nothing to show case, for example an empty inbox. */
function IntegrationEmptyState({ provider }: { provider: IntegrationProvider }) {
  return (
    <p className="text-xs text-muted-foreground text-center py-8">
      {PROVIDER_META[provider].emptyMessage}
    </p>
  );
}

/** One skeleton placeholder, loosely shaped like the real provider cards. */
function IntegrationCardSkeleton() {
  return (
    <div className="integration-card pointer-events-none space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-3.5 w-full animate-pulse rounded bg-muted/60" />
      <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/60" />
      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/60" />
    </div>
  );
}

function IntegrationSkeletonList() {
  return (
    <>
      {[0, 1, 2, 3].map((key) => (
        <IntegrationCardSkeleton key={key} />
      ))}
    </>
  );
}

/** Copy for each connection problem, so the panel can say exactly what to do. */
function problemCopy(
  provider: IntegrationProvider,
  code: IntegrationErrorCode | null | undefined,
  fallback: string
): { title: string; message: string; action: "reconnect" | "retry"; link?: { href: string; label: string } } {
  const label = PROVIDER_META[provider].label;
  switch (code) {
    case "needs_reconnect":
      return provider === "gmail"
        ? {
            title: "Google needs you to sign in again",
            message: "This happens every 7 days while your Google app is in Testing mode. Reconnect to keep your inbox here.",
            action: "reconnect",
          }
        : { title: `Your ${label} connection expired`, message: `Reconnect to keep pulling ${label} into your day.`, action: "reconnect" };
    case "rate_limited":
      return { title: `${label} is limiting requests`, message: "Try again in a few minutes.", action: "retry" };
    case "org_access":
      return {
        title: "Some organization items are hidden",
        message: "A GitHub organization you belong to has not granted Zenith access yet.",
        action: "retry",
        link: { href: "https://github.com/settings/applications", label: "Review access in GitHub settings" },
      };
    default:
      return { title: `Couldn't reach ${label}`, message: fallback || "Try again in a moment.", action: "retry" };
  }
}

export function IntegrationPanel() {
  const {
    activeIntegration,
    setActiveIntegration,
    githubIssues,
    githubPRs,
    gmailMessages,
    notionPages,
    integrationItems,
    integrationTab,
    setIntegrationTab,
    connectedIntegrations,
    integrationErrors,
    integrationCursors,
    loadingMoreProvider,
    isIntegrationsLoading,
    integrationsLoaded,
    isIntegrationsRefreshing,
    connectIntegration,
    disconnectIntegration,
    refreshIntegrationProvider,
    loadMoreIntegrationItems,
  } = useApp();
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState("all");
  const [showConfigure, setShowConfigure] = useState(false);

  if (!activeIntegration) return null;

  const provider: IntegrationProvider = activeIntegration;
  const meta = PROVIDER_META[provider];
  const connectedEntry = connectedIntegrations.find((c) => c.provider === provider);
  // "Connected" means there is an entry AND it is active: a revoked entry produces no items.
  const isConnected = Boolean(connectedEntry) && connectedEntry?.status === "active";
  const providerError = integrationErrors.find((e) => e.provider === provider);
  const isInitialLoading = isIntegrationsLoading && !integrationsLoaded;

  // GitHub relation per item (assigned, created, review requested) from the raw items.
  const relations = new Map(
    integrationItems
      .filter((item) => item.provider === "github")
      .map((item) => [item.externalId, item.githubRelation ?? []])
  );
  const isReview = (externalId?: string) => (relations.get(externalId ?? "") ?? []).includes("review_requested");
  const isMine = (externalId?: string) => {
    const relation = relations.get(externalId ?? "") ?? [];
    return relation.length === 0 || relation.includes("assigned") || relation.includes("created");
  };

  const q = query.trim().toLowerCase();
  const matches = (...fields: (string | undefined)[]) =>
    !q || fields.some((field) => field?.toLowerCase().includes(q));
  const inRepo = (repository: string) => repo === "all" || repository === repo;

  const repositories = Array.from(
    new Set([...githubIssues, ...githubPRs].map((item) => item.repository).filter(Boolean))
  ).sort();

  const items: IntegrationItem[] =
    provider === "github"
      ? integrationTab === "issues"
        ? githubIssues
            .filter((issue) => inRepo(issue.repository) && matches(issue.title, issue.repository))
            .map((data) => ({ type: "github-issue" as const, data }))
        : githubPRs
            .filter((pr) => (integrationTab === "reviews" ? isReview(pr.externalId) : isMine(pr.externalId)))
            .filter((pr) => inRepo(pr.repository) && matches(pr.title, pr.repository))
            .map((data) => ({ type: "github-pr" as const, data }))
      : provider === "gmail"
        ? gmailMessages
            .filter((message) => matches(message.subject, message.from, message.snippet))
            .map((data) => ({ type: "gmail" as const, data }))
        : notionPages
            .filter((page) => matches(page.title, page.workspace))
            .map((data) => ({ type: "notion" as const, data }));

  const hasAnyItems =
    provider === "github"
      ? githubIssues.length + githubPRs.length > 0
      : provider === "gmail"
        ? gmailMessages.length > 0
        : notionPages.length > 0;

  type PanelState = "loading" | "not-connected" | "inactive" | "error" | "empty" | "items";
  const panelState: PanelState = isInitialLoading
    ? "loading"
    : !connectedEntry
      ? "not-connected"
      : connectedEntry.status !== "active"
        ? "inactive"
        : hasAnyItems
          ? "items"
          : providerError
            ? "error"
            : "empty";

  const problem = providerError
    ? problemCopy(provider, providerError.code, providerError.error)
    : panelState === "inactive"
      ? problemCopy(provider, connectedEntry?.lastError ?? "needs_reconnect", "")
      : null;
  const runProblemAction = () =>
    problem?.action === "reconnect" ? connectIntegration(provider) : refreshIntegrationProvider(provider);

  const renderCard = (item: IntegrationItem) => {
    switch (item.type) {
      case "github-issue":
        return <GitHubIssueCard issue={item.data} />;
      case "github-pr":
        return <GitHubPRCard pr={item.data} />;
      case "gmail":
        return <GmailCard message={item.data} />;
      case "notion":
        return <NotionCard page={item.data} />;
    }
  };
  const keyOf = (item: IntegrationItem) => `${item.type}-${"externalId" in item.data ? item.data.externalId ?? item.data.id : item.data.id}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-screen w-sidebar flex-col overflow-hidden border-l border-border bg-card/95 shadow-soft backdrop-blur-sm"
      >
        {/* Header */}
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">{meta.label}</h2>
              {isConnected && (
                <p className="truncate text-xs text-muted-foreground">
                  Synced {safeFormatDistanceToNow(connectedEntry?.lastSyncedAt, { addSuffix: true }, "not yet")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isConnected && (
                <>
                  <button
                    onClick={() => refreshIntegrationProvider(provider)}
                    disabled={isIntegrationsRefreshing}
                    className="rounded p-1 transition-colors hover:bg-muted disabled:opacity-50"
                    title="Refresh"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isIntegrationsRefreshing && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => setShowConfigure(!showConfigure)}
                    className={cn("rounded p-1 transition-colors hover:bg-muted", showConfigure && "bg-muted")}
                    title="Configure"
                    aria-label="Configure"
                    aria-expanded={showConfigure}
                  >
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveIntegration(null)}
                className="rounded p-1 transition-colors hover:bg-muted"
                aria-label="Close panel"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {isConnected && connectedEntry && showConfigure && (
            <IntegrationConfigure provider={provider} entry={connectedEntry} onDisconnect={() => disconnectIntegration(provider)} />
          )}

          {isConnected && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${meta.label}`}
                className="w-full rounded-lg border border-foreground/10 bg-muted/40 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand/40"
              />
            </div>
          )}

          {isConnected && provider === "github" && (
            <>
              <div className="inset-sunken flex gap-1 rounded-xl bg-muted/80 p-1">
                {(["issues", "prs", "reviews"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setIntegrationTab(tab)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all duration-200",
                      integrationTab === tab
                        ? "bg-card text-foreground shadow-inset-soft"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "prs" ? "PRs" : tab}
                  </button>
                ))}
              </div>
              {repositories.length > 1 && (
                <select
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full rounded-lg border border-foreground/10 bg-card px-2 py-1.5 text-xs text-muted-foreground"
                  aria-label="Repository"
                >
                  <option value="all">All repositories</option>
                  {repositories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {panelState === "loading" && <IntegrationSkeletonList />}

          {panelState === "not-connected" && (
            <IntegrationConnectPrompt provider={provider} onConnect={() => connectIntegration(provider)} />
          )}

          {problem && (
            <IntegrationInlineNotice
              title={problem.title}
              message={problem.message}
              actionLabel={problem.action === "reconnect" ? "Reconnect" : "Try again"}
              onAction={runProblemAction}
              link={problem.link}
            />
          )}

          {panelState === "empty" && <IntegrationEmptyState provider={provider} />}

          {panelState === "items" && (
            <>
              {items.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">Nothing matches.</p>
              )}
              {items.map((item) => (
                <div key={keyOf(item)} className="space-y-1.5">
                  {renderCard(item)}
                  <IntegrationItemActions item={item} />
                </div>
              ))}
              {integrationCursors[provider] && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  disabled={loadingMoreProvider === provider}
                  onClick={() => loadMoreIntegrationItems(provider)}
                >
                  {loadingMoreProvider === provider ? "Loading..." : "Load more"}
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
