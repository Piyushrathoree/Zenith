import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface RitualStep {
  title: string;
  content: ReactNode;
}

interface RitualFlowProps {
  isOpen: boolean;
  onClose: () => void;
  icon: ReactNode;
  /** Background class for the icon tile, for example "bg-brand-soft". */
  iconBg: string;
  title: string;
  subtitle: string;
  steps: RitualStep[];
  finishLabel: string;
  /** Return false to stay open (for example when the save failed). */
  onFinish: () => Promise<boolean | void> | boolean | void;
  /** Wider frame for steps that show a whole week. */
  wide?: boolean;
}

/**
 * Shared frame for the guided rituals (Phase 8). Same look as the original weekly
 * rituals modal; only the content is split into steps with Back and Next.
 * Steps save as they go, so closing halfway never loses work.
 */
export function RitualFlow({
  isOpen,
  onClose,
  icon,
  iconBg,
  title,
  subtitle,
  steps,
  finishLabel,
  onFinish,
  wide,
}: RitualFlowProps) {
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // Every time the flow opens, start at step 1.
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => setIndex(0), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const isLast = index === steps.length - 1;
  const step = steps[index];

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const result = await onFinish();
      if (result !== false) onClose();
    } finally {
      setFinishing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && step && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label={title}
            className={cn(
              "fixed inset-4 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border-2 border-foreground/15 bg-card shadow-soft md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:-translate-x-1/2 md:-translate-y-1/2",
              wide ? "md:w-[900px]" : "md:w-[560px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="text-xs text-muted-foreground">
                Step {index + 1} of {steps.length}
                <span className="text-foreground"> · {step.title}</span>
              </p>
              <div className="flex gap-1">
                {steps.map((item, i) => (
                  <span
                    key={item.title}
                    className={cn(
                      "h-1.5 w-6 rounded-full transition-colors",
                      i <= index ? "bg-brand" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-5">{step.content}</div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-foreground/10 p-4">
              {index > 0 && (
                <Button type="button" variant="ghost" onClick={() => setIndex(index - 1)}>
                  Back
                </Button>
              )}
              <Button
                type="button"
                variant="brand"
                className="ml-auto min-w-40"
                disabled={finishing}
                onClick={isLast ? handleFinish : () => setIndex(index + 1)}
              >
                {isLast ? finishLabel : "Next"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
