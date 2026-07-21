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
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Task } from "@/types";

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

export function DashboardLayout() {
  const {
    activeIntegration,
    focusMode,
    moveTask,
    addTask,
    showWeeklyRituals,
    setShowWeeklyRituals,
    weeklyRitualType,
    loadIntegrations,
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
          // Prefer the server's real externalId; issue.id is only a display
          // id / React key and may be a synthesised fallback (see
          // integrationsMapping.ts), so it is used only when externalId is
          // absent.
          externalId: issue.externalId || String(issue.id),
          link: issue.url,
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
          externalId: pr.externalId || String(pr.id),
          link: pr.url,
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
          externalId: message.externalId || message.id,
          // Prefer the server's direct link when present, and only fall
          // back to rebuilding one from the thread id, which opens the
          // original thread in Gmail's web interface, when it is absent.
          link: message.link || `https://mail.google.com/mail/u/0/#all/${message.threadId}`,
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
          externalId: page.externalId || page.id,
          link: page.url,
        });
      }
    },
    [moveTask, addTask]
  );

  if (focusMode) {
    return (
      <>
        <Suspense fallback={null}>
          <IntegrationOAuthReturnHandler />
        </Suspense>
        <FocusMode />
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Suspense fallback={null}>
        <IntegrationOAuthReturnHandler />
      </Suspense>
      <div className="flex h-screen bg-background overflow-hidden font-alan">
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
