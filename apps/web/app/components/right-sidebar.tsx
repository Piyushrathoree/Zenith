"use client"

import { useState } from "react"
import {
  ChevronDown,
  Check,
  Search,
  RefreshCw,
  Github,
  Mail,
  Plus,
  Mic,
  Calendar,
  Target,
  Layers,
  Zap,
  MoreHorizontal,
} from "lucide-react"
import type { IntegrationCard } from "@/lib/types"
import IntegrationCardComponent from "@/components/integration-card"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface RightSidebarProps {
  integrations: IntegrationCard[]
  onCardClick: (card: IntegrationCard) => void
  onClose: () => void
}

type IntegrationType = "github" | "gmail" | "notion"

const subTabs = ["Issues", "PRs", "Projects"]

const iconSidebarItems = [
  { icon: Mic, id: "voice", label: "Voice", hasNotification: false },
  { icon: Calendar, id: "calendar", label: "Calendar", hasNotification: false },
  { icon: Github, id: "github", label: "GitHub", hasNotification: true },
  { icon: Target, id: "linear", label: "Linear", hasNotification: false },
  { icon: Layers, id: "notion", label: "Notion", hasNotification: false },
  { icon: Mail, id: "gmail", label: "Gmail", hasNotification: false },
  { icon: Zap, id: "zapier", label: "Zapier", hasNotification: false },
  { icon: Search, id: "search", label: "Search", hasNotification: false },
  { icon: MoreHorizontal, id: "more", label: "More", hasNotification: false },
  { icon: Plus, id: "add", label: "Add", hasNotification: true },
]

export default function RightSidebar({ integrations, onCardClick, onClose }: RightSidebarProps) {
  const [activeSubTab, setActiveSubTab] = useState("Issues")
  const [statusFilter, setStatusFilter] = useState<"open" | "closed">("open")
  const [activeIntegration, setActiveIntegration] = useState<IntegrationType>("github")
  const [searchQuery, setSearchQuery] = useState("is:issue is:open assignee:Piyushrathoree")

  // Filter integrations based on active integration type and status
  const filteredIntegrations = integrations.filter((card) => {
    if (card.source !== activeIntegration) return false
    if (activeIntegration === "github" && card.status !== statusFilter) return false
    return true
  })

  return (
    <div className="h-full flex bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col border-l border-border overflow-hidden">
        {/* Header with tabs and avatar */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {subTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200",
                    activeSubTab === tab
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Avatar className="w-7 h-7">
              <AvatarImage src="/diverse-user-avatars.png" />
              <AvatarFallback className="text-[10px]">PR</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* GitHub specific filters */}
        {activeIntegration === "github" && (
          <div className="p-3 border-b border-border space-y-3">
            {/* Repository dropdown */}
            <button className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-md text-sm border border-border/50">
              <span className="text-muted-foreground">All repositories</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Status toggles and refresh */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter("open")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200",
                  statusFilter === "open" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {statusFilter === "open" && <Check className="w-3 h-3" />}
                Open
              </button>
              <button
                onClick={() => setStatusFilter("closed")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200",
                  statusFilter === "closed" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {statusFilter === "closed" && <Check className="w-3 h-3" />}
                Closed
              </button>
              <span className="text-xs text-muted-foreground ml-auto">Assignee</span>
              <button className="p-1.5 rounded hover:bg-muted transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Search input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-md border border-border/50">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button className="text-xs text-blue-500 hover:text-blue-400 transition-colors">reset</button>
            </div>
          </div>
        )}

        {/* Integration Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredIntegrations.map((card) => (
            <IntegrationCardComponent key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
          {filteredIntegrations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No items found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Icon sidebar on the right */}
      <div className="w-12 bg-background border-l border-border flex flex-col items-center py-3 gap-1">
        {iconSidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "github") setActiveIntegration("github")
              else if (item.id === "gmail") setActiveIntegration("gmail")
              else if (item.id === "notion") setActiveIntegration("notion")
            }}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200",
              (item.id === "github" && activeIntegration === "github") ||
                (item.id === "gmail" && activeIntegration === "gmail") ||
                (item.id === "notion" && activeIntegration === "notion")
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            title={item.label}
          >
            <item.icon className="w-4 h-4" />
            {item.hasNotification && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  )
}
