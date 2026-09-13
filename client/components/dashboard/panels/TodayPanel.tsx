import { motion, AnimatePresence } from "motion/react";
import { X, Plus, CheckCircle2, Circle, Clock, Hash } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TodayPanel() {
  const {
    showTodayPanel,
    setShowTodayPanel,
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
      tag: "work",
    });

    setNewTaskTitle("");
    setShowAddForm(false);
  };

  const close = () => {
    setShowAddForm(false);
    setNewTaskTitle("");
    setShowTodayPanel(false);
  };

  return (
    <AnimatePresence>
      {showTodayPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-0 left-sidebar top-0 flex w-96 flex-col overflow-hidden border-r-2 border-foreground/15 bg-card shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Today</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  What you meant to get done
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

            <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-5">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-foreground/10 px-3 py-2.5",
                    task.completed ? "bg-brand-soft/40" : "bg-muted/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleDailyTask(task.id)}
                    className="mt-0.5"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-brand" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        task.completed && "text-muted-foreground line-through"
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {task.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.time}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {task.tag}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
                    placeholder="What should get done today?"
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
                  Add task
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
