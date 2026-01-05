import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { GitHubIssueCard } from "./integration/GitHubIssueCard";
import { GitHubPRCard } from "./integration/GitHubPRCard";
import { GmailCard } from "./integration/GmailCard";
import { NotionCard } from "./integration/NotionCard";
import { RefreshCw, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntegrationPanel() {
  const {
    activeIntegration,
    setActiveIntegration,
    githubIssues,
    githubPRs,
    gmailMessages,
    notionPages,
    integrationTab,
    setIntegrationTab,
  } = useApp();

  if (!activeIntegration) return null;

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
            <button
              onClick={() => setActiveIntegration(null)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
