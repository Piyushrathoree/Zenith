import { GitHubPR } from '@/types';
import { motion } from 'framer-motion';
import { GitPullRequest } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

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
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-3 bg-card border border-border rounded-lg cursor-grab transition-all",
        "hover:border-accent/30 hover:shadow-md",
        isDragging && "opacity-50 shadow-xl rotate-2"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <GitPullRequest className={cn("w-4 h-4 mt-0.5 flex-shrink-0", getStateColor())} />
        <p className="text-xs text-muted-foreground truncate">{pr.repository}</p>
      </div>
      
      <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
        {pr.title}
      </h4>
      
      <p className="text-xs text-muted-foreground">
        #{pr.number} · {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })} · {pr.author}
      </p>
    </motion.div>
  );
}
