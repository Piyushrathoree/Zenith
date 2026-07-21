import { useApp } from "@/context/AppContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GitHubIssueCard } from "./integration/GitHubIssueCard";
import { GitHubPRCard } from "./integration/GitHubPRCard";
import { GmailCard } from "./integration/GmailCard";
import { NotionCard } from "./integration/NotionCard";
import {
  RefreshCw,
  ChevronDown,
  Check,
  X,
  Github,
  Mail,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { IntegrationProvider } from "@/lib/api/integrations";

/**
 * True when the user's plan entitles them to integrations: pro, or an
 * active trial (mirrors the server's plan gate, see
 * featureGate.middleware.ts). Kept as a plain top level function rather than
 * inlined in the component body, so the component's render itself never
 * calls the impure Date.now directly.
 */
function isIntegrationsEntitled(
  user: { plan?: "free" | "pro"; trialEndsAt?: string | null } | null | undefined
): boolean {
  return (
    user?.plan === "pro" ||
    Boolean(user?.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now())
  );
}

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
      "Pulls your assigned issues and pull requests into this panel, so you can drag them onto your board.",
    emptyMessage: "No issues or pull requests to show right now.",
  },
  gmail: {
    label: "Gmail",
    icon: Mail,
    connectDescription:
      "Pulls your recent inbox messages into this panel, so you can drag them onto your board.",
    emptyMessage: "No messages to show right now.",
  },
  notion: {
    label: "Notion",
    icon: FileText,
    connectDescription:
      "Pulls your recently edited pages into this panel, so you can drag them onto your board.",
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
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
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

/** Centered, calm prompt shown when integrations are gated behind Pro (free plan, no active trial). */
function IntegrationUpgradePrompt({
  provider,
  onUpgrade,
}: {
  provider: IntegrationProvider;
  onUpgrade: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          Integrations are part of Pro
        </h3>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Connect GitHub, Gmail, and Notion to pull your work into one place.
        </p>
      </div>
      <Button size="sm" onClick={onUpgrade}>
        View plan
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
  onReconnect,
}: {
  title: string;
  message: string;
  onReconnect: () => void;
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-7 px-2 text-xs shrink-0"
        >
          Reconnect
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
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
    <div className="p-3 bg-card border border-border rounded-lg space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-muted/50 animate-pulse rounded" />
        <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
      </div>
      <div className="h-3.5 w-full bg-muted/50 animate-pulse rounded" />
      <div className="h-3.5 w-2/3 bg-muted/50 animate-pulse rounded" />
      <div className="h-2.5 w-1/2 bg-muted/50 animate-pulse rounded" />
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

export function IntegrationPanel() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    activeIntegration,
    setActiveIntegration,
    githubIssues,
    githubPRs,
    gmailMessages,
    notionPages,
    integrationTab,
    setIntegrationTab,
    connectedIntegrations,
    integrationErrors,
    isIntegrationsLoading,
    integrationsLoaded,
    isIntegrationsRefreshing,
    connectIntegration,
    disconnectIntegration,
    refreshIntegrationItems,
  } = useApp();

  if (!activeIntegration) return null;

  // Narrowed by the guard above: IntegrationType minus null is exactly
  // IntegrationProvider, so this is a plain rename, not a real cast.
  const provider: IntegrationProvider = activeIntegration;
  const meta = PROVIDER_META[provider];

  const isEntitled = isIntegrationsEntitled(user);

  const connectedEntry = connectedIntegrations.find((c) => c.provider === provider);
  // "Connected" means there is an entry AND it is active. An entry that is
  // expired or revoked still shows up here (see loadIntegrations/listIntegrations),
  // but it produces no items and no fetch error, so treating its mere
  // presence as connected would show an empty, working looking panel forever.
  const isConnected = Boolean(connectedEntry) && connectedEntry?.status === "active";
  const providerError = integrationErrors.find((e) => e.provider === provider);
  const isInitialLoading = isIntegrationsLoading && !integrationsLoaded;

  const currentItems =
    provider === "github"
      ? integrationTab === "issues"
        ? githubIssues
        : githubPRs
      : provider === "gmail"
      ? gmailMessages
      : notionPages;

  // Panel state machine, mutually exclusive and exhaustive:
  //   1. loading      - the initial integrations fetch has not resolved yet
  //   2. not-entitled  - free plan, no active trial: integrations are gated behind Pro
  //   3. not-connected - entitled, but there is no entry for this provider
  //   4. inactive      - an entry exists, but its status is expired or revoked
  //   5. error         - the entry is active, but its last items fetch failed
  //   6. empty         - the entry is active, the fetch succeeded, nothing to show
  //   7. items         - the entry is active, the fetch succeeded, something to show
  type PanelState =
    | "loading"
    | "not-entitled"
    | "not-connected"
    | "inactive"
    | "error"
    | "empty"
    | "items";

  const panelState: PanelState = isInitialLoading
    ? "loading"
    : !isEntitled
    ? "not-entitled"
    : !connectedEntry
    ? "not-connected"
    : connectedEntry.status !== "active"
    ? "inactive"
    : providerError
    ? "error"
    : currentItems.length === 0
    ? "empty"
    : "items";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-sidebar h-screen flex flex-col bg-card border-l border-border overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground capitalize">
              {activeIntegration}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => refreshIntegrationItems()}
                disabled={isIntegrationsRefreshing}
                className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 text-muted-foreground",
                    isIntegrationsRefreshing && "animate-spin"
                  )}
                />
              </button>
              <button
                onClick={() => setActiveIntegration(null)}
                className="p-1 hover:bg-muted rounded transition-colors"
                aria-label="Close panel"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {isConnected && connectedEntry && (
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs text-muted-foreground truncate">
                Connected as {connectedEntry.profile.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnectIntegration(provider)}
                className="h-6 px-2 text-xs shrink-0"
              >
                Disconnect
              </Button>
            </div>
          )}

          {/* GitHub Tabs */}
          {activeIntegration === "github" && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["issues", "prs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setIntegrationTab(tab)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                    integrationTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "prs" ? "PRs" : tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters (GitHub only) */}
        {activeIntegration === "github" && (
          <div className="p-4 border-b border-border space-y-3">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <span>All repositories</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-sm">
                <Check className="w-3.5 h-3.5 text-status-open" />
                <span>Open</span>
              </button>
              <button className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                Closed
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assignee</span>
              <button className="p-1.5 hover:bg-muted rounded transition-colors">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {panelState === "loading" && <IntegrationSkeletonList />}

          {panelState === "not-entitled" && (
            <IntegrationUpgradePrompt
              provider={provider}
              onUpgrade={() => router.push("/settings")}
            />
          )}

          {panelState === "not-connected" && (
            <IntegrationConnectPrompt
              provider={provider}
              onConnect={() => connectIntegration(provider)}
            />
          )}

          {panelState === "inactive" && (
            <IntegrationInlineNotice
              title="This connection needs to be reconnected."
              message={
                connectedEntry?.profile.username
                  ? `${connectedEntry.profile.username} is no longer active. Reconnect to keep pulling ${meta.label} into your board.`
                  : `Reconnect to keep pulling ${meta.label} into your board.`
              }
              onReconnect={() => connectIntegration(provider)}
            />
          )}

          {panelState === "error" && providerError && (
            <IntegrationInlineNotice
              title="This connection needs attention."
              message={providerError.error}
              onReconnect={() => connectIntegration(provider)}
            />
          )}

          {panelState === "empty" && <IntegrationEmptyState provider={provider} />}

          {panelState === "items" && (
            <>
              {activeIntegration === "github" &&
                integrationTab === "issues" &&
                githubIssues.map((issue) => (
                  <GitHubIssueCard key={issue.id} issue={issue} />
                ))}

              {activeIntegration === "github" &&
                integrationTab === "prs" &&
                githubPRs.map((pr) => <GitHubPRCard key={pr.id} pr={pr} />)}

              {activeIntegration === "gmail" &&
                gmailMessages.map((message) => (
                  <GmailCard key={message.id} message={message} />
                ))}

              {activeIntegration === "notion" &&
                notionPages.map((page) => <NotionCard key={page.id} page={page} />)}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
