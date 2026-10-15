import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { IntegrationPanel } from "@/components/dashboard/IntegrationPanel";
import { KanbanBoard } from "@/components/dashboard/kanban/KanbanBoard";
import { CreateTaskModal } from "@/components/dashboard/modals/CreateTaskModal";
import { TaskDetailModal } from "@/components/dashboard/modals/TaskDetailModal";
import { IntegrationDetailModal } from "@/components/dashboard/modals/IntegrationDetailModal";
import { HighlightsPanel } from "@/components/dashboard/panels/HighlightsPanel";
import { DailyPlanningFlow } from "@/components/dashboard/rituals/DailyPlanningFlow";
import { DailyShutdownFlow } from "@/components/dashboard/rituals/DailyShutdownFlow";
import { WeeklyRitualsPanel } from "@/components/dashboard/panels/WeeklyRitualsPanel";
import { BacklogPanel } from "@/components/dashboard/panels/BacklogPanel";
import { FocusMode } from "@/components/dashboard/FocusMode";
import { useApp } from "@/context/AppContext";
import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Task } from "@/types";
import { formatTime12h } from "@/lib/formatDate";
import { itemFromDragData } from "@/lib/integrationTasks";

/** Friendly copy for the `integration_error=<code>` codes the OAuth callback can redirect with. */
const INTEGRATION_ERROR_MESSAGES: Record<string, string> = {
  invalid_provider: "That integration is not supported, please try connecting again from the sidebar.",
  invalid_state: "Your connection request expired before it finished, please try connecting again.",
  token_exchange_failed: "We could not finish connecting with the provider, please try again in a moment.",
  server_error: "Something went wrong on our end while connecting, please try again shortly.",
};
const DEFAULT_INTEGRATION_ERROR_MESSAGE =
  "Something went wrong while connecting that integration, please try again.";

const INTEGRATION_PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  gmail: "Gmail",
  notion: "Notion",
};

/**
 * Reads the `integration_success` / `integration_error` query params the
 * server's OAuth callback redirects the browser back with, surfaces a toast,
 * then strips them from the URL with `router.replace` (never `push`, or the
 * back button would get stuck cycling through the params).
 *
 * Pulled out into its own component, wrapped in <Suspense>, because
 * useSearchParams opts a statically rendered page into client side rendering
 * up to the nearest Suspense boundary. DashboardLayout itself is already
 * rendered under a "use client" boundary (app/dashboard/page.tsx), so this
 * is just about satisfying that requirement without making the rest of the
 * dashboard wait on a Suspense fallback.
 */
function IntegrationOAuthReturnHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadIntegrations } = useApp();
  const hasHandled = useRef(false);

  useEffect(() => {
    const success = searchParams.get("integration_success");
    const errorCode = searchParams.get("integration_error");

    if (!success && !errorCode) return;
    if (hasHandled.current) return;
    hasHandled.current = true;

    if (success) {
      const label = INTEGRATION_PROVIDER_LABELS[success] || success;
      toast.success(`${label} connected successfully.`);
      void loadIntegrations();
    } else if (errorCode) {
      toast.error(INTEGRATION_ERROR_MESSAGES[errorCode] || DEFAULT_INTEGRATION_ERROR_MESSAGE);
    }

    // Strip only the two params this handler consumed, preserving anything
    // else that was on the URL, rather than discarding the whole query string.
    const remainingParams = new URLSearchParams(searchParams.toString());
    remainingParams.delete("integration_success");
    remainingParams.delete("integration_error");
    const query = remainingParams.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard");
  }, [searchParams, router, loadIntegrations]);

  return null;
}

/** The weekly backlog email links to /dashboard?ritual=weekly-planning. Opens that ritual once. */
function RitualLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setShowWeeklyRituals } = useApp();

  useEffect(() => {
    if (searchParams.get("ritual") !== "weekly-planning") return;
    setShowWeeklyRituals(true, "planning");

    const remainingParams = new URLSearchParams(searchParams.toString());
    remainingParams.delete("ritual");
    const query = remainingParams.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard");
  }, [searchParams, router, setShowWeeklyRituals]);

  return null;
}

// Small targets (15 minute slots) need the pointer position first. closestCorners picks the wrong one.
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : closestCorners(args);
};

export function DashboardLayout() {
  const {
    activeIntegration,
    moveTask,
    addIntegrationItem,
    showWeeklyRituals,
    setShowWeeklyRituals,
    weeklyRitualType,
    loadIntegrations,
    showBacklog,
    sendToBacklog,
    scheduleFromBacklog,
    updateTask,
    showHighlights,
    dailyRitual,
    setDailyRitual,
  } = useApp();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const hasLoadedIntegrations = useRef(false);

  // Load connected integrations + their items once on mount, alongside the
  // planner data load that RequireAuth.tsx already triggers. Guarded with a
  // ref (not just the empty dependency array) so React 18 strict mode's
  // dev-only double invoke of effects cannot fire this twice.
  useEffect(() => {
    if (hasLoadedIntegrations.current) return;
    hasLoadedIntegrations.current = true;
    void loadIntegrations();
  }, [loadIntegrations]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 160, tolerance: 8 },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const clearDrag = useCallback(() => {
    setActiveTask(null);
    setActiveDragType(null);
    setActiveDragData(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    setActiveDragType(data?.type || null);
    setActiveDragData(data);

    if (data?.type === "task" || data?.type === "backlog-task") {
      setActiveTask(data.task);
    }
  }, []);

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      clearDrag();
    },
    [clearDrag]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      const activeData = active.data.current;
      const overData = over?.data.current;

      clearDrag();

      if (!over) return;

      // A board task dropped on the backlog panel moves into the backlog.
      if (activeData?.type === "task" && overData?.type === "backlog") {
        sendToBacklog(activeData.task.id);
        return;
      }

      // A backlog task dropped on a day column, or on a task in that day, is scheduled for that day.
      if (activeData?.type === "backlog-task") {
        const toDate =
          overData?.type === "column"
            ? (overData.column.id as string)
            : overData?.type === "task"
              ? (overData.task.date as string)
              : undefined;
        // Weekly planning: dropped on a day of the week.
        if (overData?.type === "week-day") {
          scheduleFromBacklog(activeData.task.id, overData.date);
          return;
        }
        // Day view: a backlog task dropped on a time slot gets that day and time.
        if (overData?.type === "timeslot") {
          scheduleFromBacklog(activeData.task.id, overData.date, overData.time);
          return;
        }
        if (toDate) scheduleFromBacklog(activeData.task.id, toDate);
        return;
      }

      // Weekly planning: a board task dropped on a day of the week moves there.
      if (activeData?.type === "task" && overData?.type === "week-day") {
        if (activeData.task.date !== overData.date) moveTask(activeData.task.id, overData.date);
        return;
      }
      // Day view: a timed block dropped on a time slot takes that day and time.
      if (activeData?.type === "task" && overData?.type === "timeslot") {
        updateTask(activeData.task.id, { date: overData.date, time: overData.time });
        return;
      }
      // Day view: dropped on the unscheduled list, it loses its time and stays on the day.
      if (activeData?.type === "task" && overData?.type === "unscheduled") {
        if (activeData.task.time) updateTask(activeData.task.id, { time: "" });
        return;
      }

      if (activeData?.type === "task") {
        const fromDate = activeData.task?.date as string | undefined;
        const toDate =
          overData?.type === "column"
            ? (overData.column.id as string)
            : overData?.type === "task"
              ? (overData.task.date as string)
              : undefined;
        if (toDate && toDate !== fromDate) {
          moveTask(active.id as string, toDate);
        }
        return;
      }

      // An integration card dropped on a day, the backlog, or a week day becomes a task there.
      // addIntegrationItem refuses duplicates, so dragging the same item twice is harmless.
      const integrationItem = itemFromDragData(activeData);
      if (integrationItem) {
        if (overData?.type === "column") void addIntegrationItem(integrationItem, overData.column.id as string);
        else if (overData?.type === "week-day") void addIntegrationItem(integrationItem, overData.date as string);
        else if (overData?.type === "backlog") void addIntegrationItem(integrationItem, "backlog");
      }
    },
    [moveTask, clearDrag, sendToBacklog, scheduleFromBacklog, updateTask, addIntegrationItem]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0.12, y: 0.2 } }}
    >
      <Suspense fallback={null}>
        <IntegrationOAuthReturnHandler />
        <RitualLinkHandler />
      </Suspense>
      <div className="flex h-screen bg-background overflow-hidden font-alan">
        <LeftSidebar />

        <main className="flex-1 flex overflow-hidden">
          <KanbanBoard />
        </main>

        {activeIntegration && <IntegrationPanel />}
        {showBacklog && <BacklogPanel />}
        {showHighlights && <HighlightsPanel />}
        <RightSidebar />

        {/* Modals & Panels */}
        <CreateTaskModal />
        <TaskDetailModal />
        <IntegrationDetailModal />
        {dailyRitual === "planning" && <DailyPlanningFlow onClose={() => setDailyRitual(null)} />}
        {dailyRitual === "shutdown" && <DailyShutdownFlow onClose={() => setDailyRitual(null)} />}
        <WeeklyRitualsPanel
          isOpen={showWeeklyRituals}
          onClose={() => setShowWeeklyRituals(false)}
          type={weeklyRitualType || "planning"}
        />
        <FocusMode />
      </div>

      {/* Drag Overlay for integration cards */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {(activeDragType === "task" || activeDragType === "backlog-task") && activeTask && (
          <div className="task-card task-card-dragging h-32 w-[304px]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                {activeTask.time ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatTime12h(activeTask.time)}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                  {activeTask.duration}
                </span>
              </div>
              <h4 className="text-base font-medium text-foreground line-clamp-2 leading-snug">
                {activeTask.title}
              </h4>
              <span className="text-xs font-medium tag-work">
                #{activeTask.tag}
              </span>
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
