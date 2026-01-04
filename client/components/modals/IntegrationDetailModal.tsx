import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Mail, FileText, ExternalLink, Clock, User, Tag } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function IntegrationDetailModal() {
  const { selectedIntegrationDetail, showIntegrationModal, setShowIntegrationModal } = useApp();

  if (!showIntegrationModal || !selectedIntegrationDetail) return null;

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
        onClick={() => setShowIntegrationModal(false)}
      >
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card border-l border-border shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* GitHub Issue */}
          {selectedIntegrationDetail.type === 'github-issue' && (
            <>
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedIntegrationDetail.data.repository}</span>
                </div>
                <button
                  onClick={() => setShowIntegrationModal(false)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {selectedIntegrationDetail.data.title} #{selectedIntegrationDetail.data.number}
                  </h2>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs rounded-full font-medium flex items-center gap-1.5",
                      selectedIntegrationDetail.data.state === 'open' 
                        ? "bg-status-open/15 text-status-open"
                        : "bg-status-closed/15 text-status-closed"
                    )}>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        selectedIntegrationDetail.data.state === 'open' ? "bg-status-open" : "bg-status-closed"
                      )} />
                      {selectedIntegrationDetail.data.state === 'open' ? 'Open' : 'Closed'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedIntegrationDetail.data.author}</span> opened {formatDistanceToNow(new Date(selectedIntegrationDetail.data.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {selectedIntegrationDetail.data.body || 'No description provided.'}
                  </pre>
                </div>

                {selectedIntegrationDetail.data.assignees.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Assignees</h4>
                    <div className="flex items-center gap-2">
                      {selectedIntegrationDetail.data.assignees.map((assignee) => (
                        <div key={assignee.login} className="flex items-center gap-2">
                          <img src={assignee.avatar_url} alt={assignee.login} className="w-6 h-6 rounded-full" />
                          <span className="text-sm">{assignee.login}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedIntegrationDetail.data.labels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Labels</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIntegrationDetail.data.labels.map((label) => (
                        <span key={label.name} className={cn("px-2.5 py-1 text-xs rounded-full font-medium", getLabelColor(label.color))}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href={selectedIntegrationDetail.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-tag-personal hover:underline"
                >
                  Open in GitHub <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}

          {/* GitHub PR */}
          {selectedIntegrationDetail.type === 'github-pr' && (
            <>
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedIntegrationDetail.data.repository}</span>
                </div>
                <button onClick={() => setShowIntegrationModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {selectedIntegrationDetail.data.title} #{selectedIntegrationDetail.data.number}
                  </h2>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs rounded-full font-medium flex items-center gap-1.5",
                      selectedIntegrationDetail.data.state === 'open' && "bg-status-open/15 text-status-open",
                      selectedIntegrationDetail.data.state === 'closed' && "bg-status-closed/15 text-status-closed",
                      selectedIntegrationDetail.data.state === 'merged' && "bg-violet-500/15 text-violet-400"
                    )}>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        selectedIntegrationDetail.data.state === 'open' && "bg-status-open",
                        selectedIntegrationDetail.data.state === 'closed' && "bg-status-closed",
                        selectedIntegrationDetail.data.state === 'merged' && "bg-violet-400"
                      )} />
                      {selectedIntegrationDetail.data.state.charAt(0).toUpperCase() + selectedIntegrationDetail.data.state.slice(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedIntegrationDetail.data.author}</span> opened {formatDistanceToNow(new Date(selectedIntegrationDetail.data.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                    {selectedIntegrationDetail.data.body || 'No description provided.'}
                  </pre>
                </div>

                {selectedIntegrationDetail.data.labels.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Labels</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedIntegrationDetail.data.labels.map((label) => (
                        <span key={label.name} className={cn("px-2.5 py-1 text-xs rounded-full font-medium", getLabelColor(label.color))}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href={selectedIntegrationDetail.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-tag-personal hover:underline"
                >
                  Open in GitHub <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}

          {/* Gmail */}
          {selectedIntegrationDetail.type === 'gmail' && (
            <>
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-muted-foreground">Gmail</span>
                </div>
                <button onClick={() => setShowIntegrationModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-medium">
                      {selectedIntegrationDetail.data.from.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedIntegrationDetail.data.from}</p>
                      <p className="text-sm text-muted-foreground">{selectedIntegrationDetail.data.fromEmail}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {selectedIntegrationDetail.data.unread && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-accent/15 text-accent font-medium">Unread</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(selectedIntegrationDetail.data.date), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-xl font-semibold text-foreground mb-4">{selectedIntegrationDetail.data.subject}</h2>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedIntegrationDetail.data.snippet}
                    {'\n\n'}
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                    Reply
                  </button>
                  <button className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors">
                    Forward
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Notion */}
          {selectedIntegrationDetail.type === 'notion' && (
            <>
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedIntegrationDetail.data.workspace}</span>
                </div>
                <button onClick={() => setShowIntegrationModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{selectedIntegrationDetail.data.icon || '📄'}</div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">{selectedIntegrationDetail.data.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Edited {formatDistanceToNow(new Date(selectedIntegrationDetail.data.lastEdited), { addSuffix: true })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{selectedIntegrationDetail.data.workspace}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 min-h-[200px]">
                  <p className="text-sm text-muted-foreground italic">
                    Page content preview would appear here...
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-4/5"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </div>

                <a
                  href={selectedIntegrationDetail.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-tag-personal hover:underline"
                >
                  Open in Notion <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}