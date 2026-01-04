import { GmailMessage } from '@/types';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

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
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-3 bg-card border border-border rounded-lg cursor-pointer transition-all",
        "hover:border-accent/30 hover:shadow-md",
        message.unread && "border-l-2 border-l-accent",
        isDragging && "opacity-50 shadow-xl rotate-2 cursor-grabbing"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <Mail className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">{message.from}</p>
            {message.unread && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent/15 text-accent font-medium shrink-0">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{message.fromEmail}</p>
        </div>
      </div>
      
      <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-1">
        {message.subject}
      </h4>
      
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {message.snippet}
      </p>

      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
      </p>
    </motion.div>
  );
}