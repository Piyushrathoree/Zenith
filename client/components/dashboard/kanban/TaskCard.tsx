import { Task } from '@/types';
import { motion } from 'framer-motion';
import { Circle, CheckCircle2, Github } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTask, setShowTaskModal, updateTask } = useApp();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { completed: !task.completed });
  };

  const getTagColor = () => {
    switch (task.tag) {
      case 'work': return 'tag-work';
      case 'personal': return 'tag-personal';
      case 'health': return 'tag-health';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      layoutId={task.id}
      onClick={handleClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        "task-card group",
        isDragging && "task-card-dragging z-50",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggleComplete}
          className="mt-0.5 flex-shrink-0"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-accent" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-accent transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {task.time && (
              <span className="text-xs font-medium text-muted-foreground">{task.time}</span>
            )}
            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
              {task.duration}
            </span>
          </div>

          <h4 className={cn(
            "text-sm font-medium text-foreground mb-1.5",
            task.completed && "line-through"
          )}>
            {task.title}
          </h4>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", getTagColor())}>
              #{task.tag}
            </span>
            {task.source === 'github' && (
              <Github className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
