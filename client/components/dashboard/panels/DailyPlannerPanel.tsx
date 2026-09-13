import { motion, AnimatePresence } from "motion/react";
import { X, Plus, CheckCircle2, Circle, Clock, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DailyPlannerPanel() {
  const {
    showDailyPlanner,
    setShowDailyPlanner,
    dailyTasks,
    toggleDailyTask,
    addDailyTask,
  } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addDailyTask({
      title: newTaskTitle.trim(),
      duration: "0:30",
      completed: false,
      tag: "personal",
    });

    setNewTaskTitle("");
    setShowAddForm(false);
  };

  const close = () => {
    setShowAddForm(false);
    setNewTaskTitle("");
    setShowDailyPlanner(false);
  };

  const completedCount = dailyTasks.filter((t) => t.completed).length;
  const totalCount = dailyTasks.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <AnimatePresence>
      {showDailyPlanner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-foreground/15 bg-card shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <p className="text-sm font-medium text-foreground">Daily planner</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {totalCount === 0
                    ? "Add the rituals you want to keep every day"
                    : `${completedCount} of ${totalCount} done`}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-brand"
                />
              </div>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto px-5 py-4">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-foreground/10 px-3 py-2.5",
                    task.completed ? "bg-brand-soft/40" : "bg-muted/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleDailyTask(task.id)}
                    aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-brand" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      task.completed && "text-muted-foreground line-through"
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {task.duration}
                  </span>
                </div>
              ))}

              {showAddForm ? (
                <form
                  onSubmit={handleAddTask}
                  className="rounded-xl border border-foreground/10 bg-muted/30 p-3"
                >
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Morning stretch, inbox zero…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="brand" size="sm">
                      Add
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 py-3 text-sm text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add a ritual
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-foreground/10 px-5 py-3 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-brand" />
              Finish them all to keep the streak going.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
