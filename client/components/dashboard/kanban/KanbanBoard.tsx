import { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";
import { AnimatePresence, motion } from "motion/react";
import { CalendarView } from "./CalendarView";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";
import { DayView } from "@/components/dashboard/dayview/DayView";
import { RitualPrompt } from "@/components/dashboard/rituals/RitualPrompt";

export function KanbanBoard() {
  const {
    columns,
    getFilteredTasks,
    viewMode,
    boardJumpDate,
    boardJumpNonce,
    highlightedColumnDate,
    clearColumnHighlight,
  } = useApp();
  const { ref: scrollRef, events } = useDraggableScroll<HTMLDivElement>();

  const filteredTasks = getFilteredTasks();

  useEffect(() => {
    if (!boardJumpNonce || !boardJumpDate || viewMode !== "board") return;

    const timer = window.setTimeout(() => {
      const target = scrollRef.current?.querySelector(
        `[data-date="${boardJumpDate}"]`
      );
      target?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [boardJumpNonce, boardJumpDate, viewMode, scrollRef]);

  useEffect(() => {
    if (!highlightedColumnDate) return;
    const timer = window.setTimeout(() => clearColumnHighlight(), 1400);
    return () => window.clearTimeout(timer);
  }, [highlightedColumnDate, clearColumnHighlight]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <KanbanHeader />
      {viewMode === "board" && <RitualPrompt />}

      <AnimatePresence mode="wait">
        {viewMode === "board" ? (
          <motion.div
            key="board"
            ref={scrollRef}
            {...events}
            className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex gap-3 p-3 min-w-max h-full">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={filteredTasks}
                  highlighted={highlightedColumnDate === column.id}
                />
              ))}
            </div>
          </motion.div>
        ) : viewMode === "day" ? (
          <motion.div
            key="day"
            className="flex-1 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <DayView />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            className="flex-1 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CalendarView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
