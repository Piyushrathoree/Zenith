import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CheckCircle2, Circle, Clock, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function DailyPlannerPanel() {
  const { showDailyPlanner, setShowDailyPlanner, dailyTasks, toggleDailyTask, addDailyTask } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    addDailyTask({
      title: newTaskTitle.trim(),
      duration: '0:30',
      completed: false,
      tag: 'personal',
    });
    
    setNewTaskTitle('');
    setShowAddForm(false);
  };

  if (!showDailyPlanner) return null;

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const totalCount = dailyTasks.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowDailyPlanner(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-muted/50 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold">Daily Planner</h2>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} tasks completed
              </p>
            </div>
            <button
              onClick={() => setShowDailyPlanner(false)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 border-b border-border">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                className="h-full bg-accent rounded-full"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
            {dailyTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  task.completed ? "bg-accent/5" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <button onClick={() => toggleDailyTask(task.id)}>
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm",
                  task.completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {task.duration}
                </div>
              </motion.div>
            ))}

            {/* Add Task */}
            {showAddForm ? (
              <form onSubmit={handleAddTask} className="p-3 bg-muted/50 rounded-lg">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a daily ritual..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs bg-accent text-accent-foreground rounded-md"
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-accent/30 hover:text-foreground transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add daily ritual
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span>Complete all rituals to build a streak!</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
