import { NotionPage } from '@/types';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

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
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-3 bg-card border border-border rounded-lg cursor-pointer transition-all",
        "hover:border-accent/30 hover:shadow-md",
        isDragging && "opacity-50 shadow-xl rotate-2 cursor-grabbing"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{page.icon || <FileText className="w-6 h-6 text-muted-foreground" />}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-1">
            {page.title}
          </h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium">
              {page.workspace}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Edited {formatDistanceToNow(new Date(page.lastEdited), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}