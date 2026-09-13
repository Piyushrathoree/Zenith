import { NotionPage } from '@/types';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/formatDate';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { integrationCardHover, integrationCardSpring } from './integrationCardMotion';

interface NotionCardProps {
  page: NotionPage;
}

export function NotionCard({ page }: NotionCardProps) {
  const { openIntegrationDetail } = useApp();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `notion-${page.id}`,
    data: { type: 'notion', page },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleClick = () => {
    if (!isDragging) {
      openIntegrationDetail({ type: 'notion', data: page });
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
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
          {page.icon || <FileText className="h-4 w-4 text-muted-foreground" />}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
            {page.title}
          </h4>
          <div className="mb-2">
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {page.workspace}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Edited {safeFormatDistanceToNow(page.lastEdited, { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
