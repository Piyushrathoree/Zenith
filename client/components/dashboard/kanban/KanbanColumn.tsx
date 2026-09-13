import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Task, Column as ColumnType } from "@/types";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

interface KanbanColumnProps {
  column: ColumnType;
  tasks: Task[];
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setShowCreateModal } = useApp();

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const columnTasks = tasks.filter((task) => task.date === column.id);
  const today = isToday(column.date);

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">
              {today ? "Today" : format(column.date, "EEEE")}
            </h3>
            {today && (
              <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                {format(column.date, "EEE")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(column.date, "MMMM d")}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 px-2 py-1 space-y-2 min-h-[200px] rounded-lg transition-colors",
          isOver && "drop-zone-active"
        )}
      >
        <SortableContext
          items={columnTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {columnTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {columnTasks.length === 0 && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-border rounded-lg bg-card/50 hover:bg-card hover:text-foreground text-sm text-muted-foreground cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
