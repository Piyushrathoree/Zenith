import { GitHubPR } from '@/types';
import { motion } from 'framer-motion';
import { GitPullRequest } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/formatDate';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { integrationCardHover, integrationCardSpring } from './integrationCardMotion';

interface GitHubPRCardProps {
  pr: GitHubPR;
}

export function GitHubPRCard({ pr }: GitHubPRCardProps) {
  const { openIntegrationDetail } = useApp();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `github-pr-${pr.id}`,
    data: { type: 'github-pr', pr },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getStateColor = () => {
    switch (pr.state) {
      case 'open': return 'text-status-open bg-status-open/15';
      case 'merged': return 'text-violet-400 bg-violet-500/15';
      case 'closed': return 'text-red-400 bg-red-500/15';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getIconColor = () => {
    switch (pr.state) {
      case 'open': return 'text-status-open';
      case 'merged': return 'text-violet-400';
      case 'closed': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const handleClick = () => {
    if (!isDragging) {
      openIntegrationDetail({ type: 'github-pr', data: pr });
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
        <span className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-personal-soft",
          getIconColor(),
        )}>
          <GitPullRequest className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{pr.repository}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", getStateColor())}>
          {pr.state}
        </span>
      </div>

      <h4 className="mb-2 line-clamp-2 text-sm font-medium text-foreground">
        {pr.title}
      </h4>

      <p className="text-xs text-muted-foreground">
        #{pr.number} · {safeFormatDistanceToNow(pr.createdAt, { addSuffix: true })} · {pr.author}
      </p>
    </motion.div>
  );
}
