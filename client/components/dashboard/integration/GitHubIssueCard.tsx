import { GitHubIssue } from "@/types";
import { motion } from "framer-motion";
import { Calendar, Github } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useApp } from "@/context/AppContext";

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
    // Only open modal if not dragging
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
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-3 bg-card border border-border rounded-lg cursor-pointer transition-all",
        "hover:border-accent/30 hover:shadow-md",
        isDragging && "opacity-50 shadow-xl rotate-2 cursor-grabbing"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Github className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground truncate flex-1">
          {issue.repository}
        </p>
        <span
          className={cn(
            "px-2 py-0.5 text-xs rounded-full font-medium flex items-center gap-1",
            issue.state === "open"
              ? "bg-status-open/15 text-status-open"
              : "bg-status-closed/15 text-status-closed"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              issue.state === "open" ? "bg-status-open" : "bg-status-closed"
            )}
          />
          {issue.state === "open" ? "Open" : "Closed"}
        </span>
      </div>

      <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
        {issue.title}
      </h4>

      <p className="text-xs text-muted-foreground mb-3">
        #{issue.number} ·{" "}
        {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })} ·{" "}
        {issue.author}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {issue.labels.slice(0, 3).map((label) => (
          <span
            key={label.name}
            className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              getLabelColor(label.color)
            )}
          >
            {label.name}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>Today</span>
        </div>
        {issue.assignees[0] && (
          <Image
            src={issue.assignees[0].avatar_url}
            alt={issue.assignees[0].login}
            width={24}
            height={24}
            unoptimized
            className="w-6 h-6 rounded-full ring-2 ring-card"
          />
        )}
      </div>
    </motion.div>
  );
}
