import { GitHubIssue } from "@/types";
import { motion } from "framer-motion";
import { Calendar, Github } from "lucide-react";
import { safeFormatDistanceToNow } from "@/lib/formatDate";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { integrationCardHover, integrationCardSpring } from "./integrationCardMotion";

interface GitHubIssueCardProps {
  issue: GitHubIssue;
}

export function GitHubIssueCard({ issue }: GitHubIssueCardProps) {
  const { openIntegrationDetail } = useApp();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `github-issue-${issue.id}`,
      data: { type: "github-issue", issue },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getLabelColor = (color: string) => {
    const colors: Record<string, string> = {
      d73a4a: "bg-red-500/15 text-red-400",
      "008672": "bg-emerald-500/15 text-emerald-400",
      "7057ff": "bg-violet-500/15 text-violet-400",
      a2eeef: "bg-cyan-500/15 text-cyan-400",
    };
    return colors[color] || "bg-muted text-muted-foreground";
  };

  const handleClick = () => {
    if (!isDragging) {
      openIntegrationDetail({ type: "github-issue", data: issue });
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      whileHover={isDragging ? undefined : integrationCardHover}
      transition={integrationCardSpring}
      className={cn("integration-card", isDragging && "integration-card-dragging")}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-work-soft text-tag-work">
          <Github className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {issue.repository}
        </p>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            issue.state === "open"
              ? "bg-status-open/15 text-status-open"
              : "bg-status-closed/15 text-status-closed",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              issue.state === "open" ? "bg-status-open" : "bg-status-closed",
            )}
          />
          {issue.state === "open" ? "Open" : "Closed"}
        </span>
      </div>

      <h4 className="mb-2 line-clamp-2 text-sm font-medium text-foreground">
        {issue.title}
      </h4>

      <p className="mb-3 text-xs text-muted-foreground">
        #{issue.number} ·{" "}
        {safeFormatDistanceToNow(issue.createdAt, { addSuffix: true })} ·{" "}
        {issue.author}
      </p>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {issue.labels.slice(0, 3).map((label) => (
          <span
            key={label.name}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              getLabelColor(label.color),
            )}
          >
            {label.name}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Today</span>
        </div>
        {issue.assignees[0] && (
          <Image
            src={issue.assignees[0].avatar_url}
            alt={issue.assignees[0].login}
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 rounded-full ring-2 ring-card"
          />
        )}
      </div>
    </motion.div>
  );
}
