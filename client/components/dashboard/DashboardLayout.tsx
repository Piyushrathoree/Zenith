import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { IntegrationPanel } from "@/components/dashboard/IntegrationPanel";
import { KanbanBoard } from "@/components/dashboard/kanban/KanbanBoard";
import { CreateTaskModal } from "@/components/dashboard/modals/CreateTaskModal";
import { TaskDetailModal } from "@/components/dashboard/modals/TaskDetailModal";
import { IntegrationDetailModal } from "@/components/dashboard/modals/IntegrationDetailModal";
import { TodayPanel } from "@/components/dashboard/panels/TodayPanel";
import { DailyPlannerPanel } from "@/components/dashboard/panels/DailyPlannerPanel";
import { WeeklyRitualsPanel } from "@/components/dashboard/panels/WeeklyRitualsPanel";
import { FocusMode } from "@/components/dashboard/FocusMode";
import { useApp } from "@/context/AppContext";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
} from "@dnd-kit/core";
import { useState, useCallback } from "react";
import { Task } from "@/types";

export function DashboardLayout() {
  const {
    activeIntegration,
    focusMode,
    moveTask,
    addTask,
    columns,
    showWeeklyRituals,
    setShowWeeklyRituals,
    weeklyRitualType,
  } = useApp();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    setActiveDragType(data?.type || null);
    setActiveDragData(data);

    if (data?.type === "task") {
      setActiveTask(data.task);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveTask(null);
      setActiveDragType(null);
      setActiveDragData(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Handle task drop onto column
      if (activeData?.type === "task" && overData?.type === "column") {
        moveTask(active.id as string, overData.column.id);
      }

      // Handle GitHub issue drop
      if (activeData?.type === "github-issue" && overData?.type === "column") {
        const issue = activeData.issue;
        addTask({
          title: issue.title,
          duration: "1:00",
          tag: "work",
          date: overData.column.id,
          completed: false,
          source: "github",
          sourceData: issue,
        });
      }

      // Handle GitHub PR drop
      if (activeData?.type === "github-pr" && overData?.type === "column") {
        const pr = activeData.pr;
        addTask({
          title: pr.title,
          duration: "0:30",
          tag: "work",
          date: overData.column.id,
          completed: false,
          source: "github",
        });
      }

      // Handle Gmail drop
      if (activeData?.type === "gmail" && overData?.type === "column") {
        const message = activeData.message;
        addTask({
          title: `Reply: ${message.subject}`,
          duration: "0:15",
          tag: "work",
          date: overData.column.id,
          completed: false,
          source: "gmail",
        });
      }

      // Handle Notion drop
      if (activeData?.type === "notion" && overData?.type === "column") {
        const page = activeData.page;
        addTask({
          title: page.title,
          duration: "0:30",
          tag: "work",
          date: overData.column.id,
          completed: false,
          source: "notion",
        });
      }
    },
    [moveTask, addTask]
  );

  if (focusMode) {
    return <FocusMode />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-background overflow-hidden">
        <LeftSidebar />

        <main className="flex-1 flex overflow-hidden">
          <KanbanBoard />
        </main>

        {activeIntegration && <IntegrationPanel />}
        <RightSidebar />

        {/* Modals & Panels */}
        <CreateTaskModal />
        <TaskDetailModal />
        <IntegrationDetailModal />
        <TodayPanel />
        <DailyPlannerPanel />
        <WeeklyRitualsPanel
          isOpen={showWeeklyRituals}
          onClose={() => setShowWeeklyRituals(false)}
          type={weeklyRitualType || "planning"}
        />
      </div>

      {/* Drag Overlay for integration cards */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeDragType === "task" && activeTask && (
          <div className="task-card task-card-dragging w-72">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  {activeTask.time && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeTask.time}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                    {activeTask.duration}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1.5">
                  {activeTask.title}
                </h4>
                <span className="text-xs font-medium tag-work">
                  #{activeTask.tag}
                </span>
              </div>
            </div>
          </div>
        )}
        {activeDragType === "github-issue" && activeDragData?.issue && (
          <div className="p-3 bg-card border border-accent rounded-lg shadow-xl w-72 rotate-2">
            <h4 className="text-sm font-medium text-foreground">
              {activeDragData.issue.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              #{activeDragData.issue.number}
            </p>
          </div>
        )}
        {activeDragType === "github-pr" && activeDragData?.pr && (
          <div className="p-3 bg-card border border-accent rounded-lg shadow-xl w-72 rotate-2">
            <h4 className="text-sm font-medium text-foreground">
              {activeDragData.pr.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              #{activeDragData.pr.number}
            </p>
          </div>
        )}
        {activeDragType === "gmail" && activeDragData?.message && (
          <div className="p-3 bg-card border border-accent rounded-lg shadow-xl w-72 rotate-2">
            <h4 className="text-sm font-medium text-foreground">
              {activeDragData.message.subject}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {activeDragData.message.from}
            </p>
          </div>
        )}
        {activeDragType === "notion" && activeDragData?.page && (
          <div className="p-3 bg-card border border-accent rounded-lg shadow-xl w-72 rotate-2">
            <h4 className="text-sm font-medium text-foreground">
              {activeDragData.page.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {activeDragData.page.workspace}
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
