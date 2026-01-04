import { useState } from 'react';
import { Filter, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type FilterTag = 'work' | 'personal' | 'health' | 'all';
export type FilterStatus = 'all' | 'completed' | 'pending';

interface FilterDropdownProps {
  selectedTags: FilterTag[];
  selectedStatus: FilterStatus;
  onTagChange: (tags: FilterTag[]) => void;
  onStatusChange: (status: FilterStatus) => void;
  onReset: () => void;
}

export function FilterDropdown({
  selectedTags,
  selectedStatus,
  onTagChange,
  onStatusChange,
  onReset,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tags: { value: FilterTag; label: string; color: string }[] = [
    { value: 'all', label: 'All Tags', color: 'bg-muted' },
    { value: 'work', label: 'Work', color: 'bg-tag-work' },
    { value: 'personal', label: 'Personal', color: 'bg-tag-personal' },
    { value: 'health', label: 'Health', color: 'bg-tag-health' },
  ];

  const statuses: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All Tasks' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ];

  const toggleTag = (tag: FilterTag) => {
    if (tag === 'all') {
      onTagChange(['all']);
    } else {
      const newTags = selectedTags.includes('all')
        ? [tag]
        : selectedTags.includes(tag)
          ? selectedTags.filter(t => t !== tag)
          : [...selectedTags, tag];
      onTagChange(newTags.length === 0 ? ['all'] : newTags);
    }
  };

  const hasActiveFilters = !selectedTags.includes('all') || selectedStatus !== 'all';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors",
          hasActiveFilters && "bg-accent/10 text-accent"
        )}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm">Filter</span>
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg z-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={onReset}
                    className="text-xs text-accent hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Tag Filters */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => toggleTag(tag.value)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors",
                        selectedTags.includes(tag.value)
                          ? "bg-accent/10 text-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className={cn("w-3 h-3 rounded-full", tag.color)} />
                      <span className="text-sm flex-1 text-left">{tag.label}</span>
                      {selectedTags.includes(tag.value) && (
                        <Check className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                <div className="space-y-1">
                  {statuses.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => onStatusChange(status.value)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors",
                        selectedStatus === status.value
                          ? "bg-accent/10 text-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="text-sm flex-1 text-left">{status.label}</span>
                      {selectedStatus === status.value && (
                        <Check className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
