import { GmailMessage } from '@/types';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/formatDate';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { integrationCardHover, integrationCardSpring } from './integrationCardMotion';

interface GmailCardProps {
  message: GmailMessage;
}

export function GmailCard({ message }: GmailCardProps) {
  const { openIntegrationDetail } = useApp();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `gmail-${message.id}`,
    data: { type: 'gmail', message },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleClick = () => {
    if (!isDragging) {
      openIntegrationDetail({ type: 'gmail', data: message });
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
      className={cn(
        "integration-card",
        message.unread && "border-l-2 border-l-brand pl-3",
        isDragging && "integration-card-dragging",
      )}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <Mail className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">{message.from}</p>
            {message.unread && (
              <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                New
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{message.fromEmail}</p>
        </div>
      </div>

      <h4 className="mb-1 line-clamp-1 text-sm font-medium text-foreground">
        {message.subject}
      </h4>

      <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {message.snippet}
      </p>

      <p className="text-[11px] text-muted-foreground">
        {safeFormatDistanceToNow(message.date, { addSuffix: true })}
      </p>
    </motion.div>
  );
}
