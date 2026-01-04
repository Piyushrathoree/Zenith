import { useApp } from "@/context/AppContext";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarView } from "./CalendarView";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  const { columns, getFilteredTasks, viewMode } = useApp();
  // Using the hook's ref instead of creating a new one
  const { ref: scrollRef, events } = useDraggableScroll<HTMLDivElement>();

  const filteredTasks = getFilteredTasks();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <KanbanHeader />

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
            <div className="flex gap-4 p-4 min-w-max h-full">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={filteredTasks}
                />
              ))}
            </div>
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
