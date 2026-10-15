import { Task } from "@/types";
import { Circle, CheckCircle2, FileText, Github, Mail, Repeat } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatTime12h } from "@/lib/formatDate";
import { useApp } from "@/context/AppContext";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { setSelectedTask, setShowTaskModal, updateTask } = useApp();
  const skipClick = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  });

  useEffect(() => {
    if (isDragging) skipClick.current = true;
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { completed: !task.completed });
  };

  const getTagColor = () => {
    switch (task.tag) {
      case "work":
        return "tag-work";
      case "personal":
        return "tag-personal";
      case "health":
        return "tag-health";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div
      ref={setNodeRef}
      data-no-drag
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "task-card group h-32 w-full",
        isDragging && "task-card-placeholder",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex h-full items-start gap-3">
        <button
          type="button"
          onClick={handleToggleComplete}
          className="mt-0.5 flex-shrink-0"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-brand" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground/50 hover:text-foreground transition-colors" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            {task.time ? (
              <span className="text-xs font-medium text-muted-foreground">
                {formatTime12h(task.time)}
              </span>
            ) : (
              <span />
            )}
            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
              {task.duration}
            </span>
          </div>

          <h4
            className={cn(
              "text-base font-medium text-foreground line-clamp-2 leading-snug",
              task.completed && "line-through"
            )}
          >
            {task.title}
          </h4>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", getTagColor())}>
              #{task.tag}
            </span>
            {task.source === "github" && (
              <Github className="w-3.5 h-3.5 text-muted-foreground" aria-label="From GitHub" />
            )}
            {task.source === "gmail" && (
              <Mail className="w-3.5 h-3.5 text-muted-foreground" aria-label="From Gmail" />
            )}
            {task.source === "notion" && (
              <FileText className="w-3.5 h-3.5 text-muted-foreground" aria-label="From Notion" />
            )}
            {task.recurringTaskId && (
              <Repeat className="w-3.5 h-3.5 text-muted-foreground" aria-label="Repeats" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
