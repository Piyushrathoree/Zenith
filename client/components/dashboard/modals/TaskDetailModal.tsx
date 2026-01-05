import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle, CheckCircle2, Play, Github, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GitHubIssue } from '@/types';

export function TaskDetailModal() {
  const { selectedTask, showTaskModal, setShowTaskModal, updateTask } = useApp();

  if (!showTaskModal || !selectedTask) return null;

  const githubIssue = selectedTask.source === 'github' 
    ? selectedTask.sourceData as GitHubIssue 
    : null;

  const getLabelColor = (color: string) => {
    const colors: Record<string, string> = {
      'd73a4a': 'bg-red-500/15 text-red-400',
      '008672': 'bg-emerald-500/15 text-emerald-400',
      '7057ff': 'bg-violet-500/15 text-violet-400',
      'a2eeef': 'bg-cyan-500/15 text-cyan-400',
    };
    return colors[color] || 'bg-muted text-muted-foreground';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => setShowTaskModal(false)}
      >
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card border-l border-border shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className={cn(
                "text-sm font-medium",
                selectedTask.tag === 'work' && "text-tag-work",
                selectedTask.tag === 'personal' && "text-tag-personal",
                selectedTask.tag === 'health' && "text-tag-health"
              )}>
                #{selectedTask.tag}
              </span>
              <span className="text-sm text-muted-foreground">
                Start: {format(new Date(selectedTask.date), 'MMM d')}
              </span>
            </div>
            <button
              onClick={() => setShowTaskModal(false)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Task Header */}
            <div className="flex items-start gap-4">
              <button
                onClick={() => updateTask(selectedTask.id, { completed: !selectedTask.completed })}
                className="mt-1"
              >
                {selectedTask.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground hover:text-accent transition-colors" />
                )}
              </button>
              <div className="flex-1">
                <h2 className={cn(
                  "text-xl font-semibold text-foreground",
                  selectedTask.completed && "line-through opacity-60"
                )}>
                  {selectedTask.title}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ACTUAL</span>
                  <p className="font-medium">--:--</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PLANNED</span>
                  <p className="font-medium">{selectedTask.duration}</p>
                </div>
                <button className="p-2 hover:bg-muted rounded-lg">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <textarea
                placeholder="Notes..."
                defaultValue={selectedTask.notes}
                className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none text-muted-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* GitHub Issue Section */}
            {githubIssue && (
              <div className="border-t border-border pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Github className="w-5 h-5 text-muted-foreground" />
                  <a 
                    href={githubIssue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-tag-personal hover:underline"
                  >
                    GitHub Issue
                  </a>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {githubIssue.title} #{githubIssue.number}
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <span className="status-badge status-open">
                    <span className="w-2 h-2 rounded-full bg-status-open" />
                    Open
                  </span>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{githubIssue.author}</span> opened this issue {format(new Date(githubIssue.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Issue Body */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {githubIssue.body}
                  </pre>
                </div>

                {/* Assignees */}
                {githubIssue.assignees.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Assignees</h4>
                    <div className="flex items-center gap-2">
                      {githubIssue.assignees.map((assignee) => (
                        <div key={assignee.login} className="flex items-center gap-2">
                          <img
                            src={assignee.avatar_url}
                            alt={assignee.login}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm">{assignee.login}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {githubIssue.labels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Labels</h4>
                    <div className="flex flex-wrap gap-2">
                      {githubIssue.labels.map((label) => (
                        <span
                          key={label.name}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full font-medium",
                            getLabelColor(label.color)
                          )}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href={githubIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-tag-personal hover:underline"
                >
                  Open in GitHub
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
