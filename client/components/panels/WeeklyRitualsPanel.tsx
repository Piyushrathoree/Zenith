import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ListChecks, TrendingUp, Target, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface WeeklyRitualsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'planning' | 'review';
}

interface WeeklyGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
}

export function WeeklyRitualsPanel({ isOpen, onClose, type }: WeeklyRitualsPanelProps) {
  const [goals, setGoals] = useState<WeeklyGoal[]>([
    { id: '1', title: 'Complete project milestones', progress: 3, target: 5 },
    { id: '2', title: 'Exercise sessions', progress: 2, target: 4 },
    { id: '3', title: 'Read for 30 minutes', progress: 5, target: 7 },
  ]);
  const [newGoal, setNewGoal] = useState('');
  const [priorities, setPriorities] = useState<string[]>([
    'Finish Q4 report',
    'Team sync meeting',
    'Review pull requests',
  ]);
  const [newPriority, setNewPriority] = useState('');
  
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals(prev => [...prev, {
        id: Date.now().toString(),
        title: newGoal,
        progress: 0,
        target: 5,
      }]);
      setNewGoal('');
    }
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      setPriorities(prev => [...prev, newPriority]);
      setNewPriority('');
    }
  };

  const updateGoalProgress = (id: string, increment: number) => {
    setGoals(prev => prev.map(goal =>
      goal.id === id 
        ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + increment)) }
        : goal
    ));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                {type === 'planning' ? (
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-tag-health/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-tag-health" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {type === 'planning' ? 'Weekly Planning' : 'Weekly Review'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Week Overview */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Week Overview
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-center p-2 rounded-lg",
                        format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted/50"
                      )}
                    >
                      <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                      <p className="text-lg font-semibold">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Goals */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  Weekly Goals
                </h3>
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground">{goal.title}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateGoalProgress(goal.id, -1)}
                            className="w-6 h-6 rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium text-accent min-w-[40px] text-center">
                            {goal.progress}/{goal.target}
                          </span>
                          <button
                            onClick={() => updateGoalProgress(goal.id, 1)}
                            className="w-6 h-6 rounded bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(goal.progress / goal.target) * 100}%` }}
                          className="h-full bg-accent rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="Add a new goal..."
                      className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    />
                    <button
                      onClick={handleAddGoal}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Top Priorities */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-muted-foreground" />
                  Top Priorities
                </h3>
                <div className="space-y-2">
                  {priorities.map((priority, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                    >
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-sm font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-foreground flex-1">{priority}</span>
                      <button
                        onClick={() => setPriorities(prev => prev.filter((_, i) => i !== idx))}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </motion.div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      placeholder="Add a priority..."
                      className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
                    />
                    <button
                      onClick={handleAddPriority}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Allocation (for planning) */}
              {type === 'planning' && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Time Allocation
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-tag-work/10 rounded-lg border border-tag-work/20">
                      <p className="text-2xl font-bold text-tag-work">24h</p>
                      <p className="text-xs text-muted-foreground">Work</p>
                    </div>
                    <div className="text-center p-3 bg-tag-personal/10 rounded-lg border border-tag-personal/20">
                      <p className="text-2xl font-bold text-tag-personal">12h</p>
                      <p className="text-xs text-muted-foreground">Personal</p>
                    </div>
                    <div className="text-center p-3 bg-tag-health/10 rounded-lg border border-tag-health/20">
                      <p className="text-2xl font-bold text-tag-health">6h</p>
                      <p className="text-xs text-muted-foreground">Health</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
              >
                {type === 'planning' ? 'Start Planning' : 'Complete Review'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
