import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Inbox, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

/** One backlog task. Drag it onto a day column to schedule it. Click it to open the details. */
function BacklogRow({ task }: { task: Task }) {
  const { setSelectedTask, setShowTaskModal } = useApp();
  // Same click guard as TaskCard.tsx: the click that ends a drag must not open the modal.
  const skipClick = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `backlog-${task.id}`,
    data: { type: "backlog-task", task },
  });

  useEffect(() => {
    if (isDragging) skipClick.current = true;
  }, [isDragging]);

  const handleClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "flex cursor-grab items-center justify-between gap-2 rounded-lg border border-foreground/10 bg-card px-3 py-2 text-sm hover:border-foreground/20 active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <span className="truncate text-foreground">{task.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{task.duration}</span>
    </div>
  );
}

export function BacklogPanel() {
  const { backlogTasks, setShowBacklog, addBacklogTask } = useApp();
  const [draft, setDraft] = useState("");

  // The whole list is a drop target, so a board task dropped here goes to the backlog.
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog-dropzone",
    data: { type: "backlog" },
  });

  const handleAdd = () => {
    const title = draft.trim();
    if (!title) return;
    addBacklogTask({ title, tag: "work", duration: "0:30" });
    setDraft("");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-screen w-sidebar flex-col overflow-hidden border-l border-border bg-card/95 shadow-soft backdrop-blur-sm"
      >
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Backlog</h2>
              <span className="text-xs text-muted-foreground">{backlogTasks.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBacklog(false)}
              className="rounded p-1 transition-colors hover:bg-muted"
              aria-label="Close backlog"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add to backlog and press Enter..."
            className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
          />
        </div>

        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 space-y-2 overflow-y-auto p-3 transition-colors",
            isOver && "bg-brand-soft/40"
          )}
        >
          {backlogTasks.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              Nothing in your backlog. Drop a task here to save it for later.
            </p>
          ) : (
            backlogTasks.map((task) => <BacklogRow key={task.id} task={task} />)
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
