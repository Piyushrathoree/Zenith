import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CheckCircle2, Circle, Clock, Hash } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function TodayPanel() {
  const { showTodayPanel, setShowTodayPanel, dailyTasks, toggleDailyTask, addDailyTask } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    addDailyTask({
      title: newTaskTitle.trim(),
      duration: '0:30',
      completed: false,
      tag: 'work',
    });
    
    setNewTaskTitle('');
    setShowAddForm(false);
  };

  if (!showTodayPanel) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => setShowTodayPanel(false)}
      >
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute left-sidebar top-0 bottom-0 w-96 bg-card border-r border-border shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-4 py-4 bg-card border-b border-border">
            <h2 className="text-lg font-semibold">Today's Plan</h2>
            <button
              onClick={() => setShowTodayPanel(false)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Tasks List */}
            {dailyTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <button onClick={() => toggleDailyTask(task.id)}>
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {task.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.time}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {task.tag}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {task.duration}
                </span>
              </motion.div>
            ))}

            {/* Add Task Form */}
            {showAddForm ? (
              <form onSubmit={handleAddTask} className="p-3 bg-muted/50 rounded-lg">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What do you want to accomplish today?"
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
                Add task
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
