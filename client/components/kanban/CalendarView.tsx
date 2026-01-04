import { useApp } from '@/context/AppContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

export function CalendarView() {
  const { tasks, setShowCreateModal, setSelectedTask, setShowTaskModal } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows: Date[][] = [];
  let days: Date[] = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    rows.push(days);
    days = [];
  }

  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter(task => task.date === format(date, 'yyyy-MM-dd'));
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'work': return 'bg-tag-work/20 text-tag-work';
      case 'personal': return 'bg-tag-personal/20 text-tag-personal';
      case 'health': return 'bg-tag-health/20 text-tag-health';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentMonth(addDays(monthStart, -1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-6 gap-1">
        <AnimatePresence mode="wait">
          {rows.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((date, dayIdx) => {
                const dayTasks = getTasksForDate(date);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isCurrentDay = isToday(date);
                
                return (
                  <motion.div
                    key={date.toISOString()}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (weekIdx * 7 + dayIdx) * 0.01 }}
                    className={cn(
                      "min-h-24 p-1.5 rounded-lg border border-border/50 transition-all group",
                      isCurrentMonth ? "bg-card" : "bg-muted/30",
                      isCurrentDay && "ring-2 ring-accent ring-offset-2 ring-offset-background",
                      "hover:border-accent/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                          isCurrentDay ? "bg-accent text-accent-foreground" : "text-foreground",
                          !isCurrentMonth && "text-muted-foreground/50"
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    
                    <div className="space-y-0.5 overflow-hidden">
                      {dayTasks.slice(0, 3).map((task) => (
                        <motion.button
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          whileHover={{ scale: 1.02 }}
                          className={cn(
                            "w-full text-left px-1.5 py-0.5 rounded text-xs truncate",
                            task.completed ? "line-through opacity-50" : "",
                            getTagColor(task.tag)
                          )}
                        >
                          {task.title}
                        </motion.button>
                      ))}
                      {dayTasks.length > 3 && (
                        <p className="text-xs text-muted-foreground px-1.5">
                          +{dayTasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
