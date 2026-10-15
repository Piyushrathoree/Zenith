import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { formatTime12h } from "@/lib/formatDate";
import { blockGeometry, durationToMinutes, minutesToDuration, snapDuration } from "@/lib/timebox";
import type { Task } from "@/types";

/**
 * One scheduled task on the timeline. Drag the block to move it to another time.
 * Drag its bottom edge to change the duration in 15 minute steps.
 */
export function TimeBlock({ task, overlapping }: { task: Task; overlapping: boolean }) {
  const { updateTask, setSelectedTask, setShowTaskModal } = useApp();
  const [previewMinutes, setPreviewMinutes] = useState<number | null>(null);
  // Same click guard as TaskCard.tsx: a drag or resize must not open the detail modal.
  const skipClick = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `timeblock-${task.id}`, // must differ from TaskCard's id
    data: { type: "task", task }, // same type as TaskCard, so the existing drop logic works
  });

  useEffect(() => {
    if (isDragging) skipClick.current = true;
  }, [isDragging]);

  const startTime = task.time ?? "00:00";
  const duration = previewMinutes !== null ? minutesToDuration(previewMinutes) : task.duration;
  const { top, height } = blockGeometry(startTime, duration);

  const handleClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation(); // keeps dnd-kit from starting a move drag
    event.preventDefault();
    skipClick.current = true; // the click after this resize must not open the modal

    const startY = event.clientY;
    const startMinutes = durationToMinutes(task.duration);
    let latest = startMinutes;

    const onMove = (e: PointerEvent) => {
      latest = snapDuration(startMinutes, e.clientY - startY);
      setPreviewMinutes(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setPreviewMinutes(null);
      if (latest !== startMinutes) void updateTask(task.id, { duration: minutesToDuration(latest) });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "absolute left-16 right-2 cursor-grab rounded-md border bg-card px-2 py-1 text-xs shadow-sm active:cursor-grabbing",
        overlapping && "ring-2 ring-destructive/60",
        task.completed && "opacity-60 line-through",
        isDragging && "opacity-40"
      )}
      style={{ top, height }}
    >
      <div className="flex justify-between gap-2">
        <span className="truncate font-medium">{task.title}</span>
        <span className="shrink-0 text-muted-foreground">
          {formatTime12h(startTime)} · {duration}
        </span>
      </div>
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        aria-label="Resize"
      />
    </div>
  );
}
