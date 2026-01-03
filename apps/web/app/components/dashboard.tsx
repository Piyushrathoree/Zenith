"use client";

import { useState } from "react";
import LeftSidebar from "@/components/left-sidebar";
import KanbanBoard from "@/components/kanban-board";
import RightSidebar from "@/components/right-sidebar";
import TaskModal from "@/components/task-modal";
import TaskDetailPanel from "@/components/task-detail-panel";
import TodayView from "@/components/today-view";
import DailyPlanner from "@/components/daily-planner";
import FocusMode from "@/components/focus-mode";
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Task, IntegrationCard, KanbanData } from "@/lib/types";
import { initialKanbanData, integrationCards } from "@/lib/data";
import { Menu, PanelRightClose } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
    const [kanbanData, setKanbanData] = useState<KanbanData>(initialKanbanData);
    const [integrations, setIntegrations] =
        useState<IntegrationCard[]>(integrationCards);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeIntegration, setActiveIntegration] =
        useState<IntegrationCard | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedColumnId, setSelectedColumnId] = useState<string | null>(
        null
    );
    const [selectedTask, setSelectedTask] = useState<
        Task | IntegrationCard | null
    >(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
    const [currentView, setCurrentView] = useState<
        "kanban" | "today" | "focus" | "daily-planner"
    >("kanban");
    const [focusTask, setFocusTask] = useState<Task | null>(null);
    const [showDailyPlanner, setShowDailyPlanner] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeId = active.id as string;

        const integration = integrations.find((i) => i.id === activeId);
        if (integration) {
            setActiveIntegration(integration);
            return;
        }

        for (const column of kanbanData.columns) {
            const task = column.tasks.find((t) => t.id === activeId);
            if (task) {
                setActiveTask(task);
                return;
            }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const sourceColumn = kanbanData.columns.find((col) =>
            col.tasks.some((task) => task.id === activeId)
        );

        let destColumn = kanbanData.columns.find((col) => col.id === overId);
        if (!destColumn) {
            destColumn = kanbanData.columns.find((col) =>
                col.tasks.some((t) => t.id === overId)
            );
        }

        if (!sourceColumn || !destColumn || sourceColumn.id === destColumn.id)
            return;

        setKanbanData((prev) => {
            const newColumns = prev.columns.map((col) => {
                if (col.id === sourceColumn.id) {
                    return {
                        ...col,
                        tasks: col.tasks.filter((task) => task.id !== activeId),
                    };
                }
                if (col.id === destColumn!.id) {
                    const task = sourceColumn.tasks.find(
                        (t) => t.id === activeId
                    );
                    if (!task) return col;
                    const overIndex = col.tasks.findIndex(
                        (t) => t.id === overId
                    );
                    const newTasks = [...col.tasks];
                    if (overIndex >= 0) {
                        newTasks.splice(overIndex, 0, task);
                    } else {
                        newTasks.push(task);
                    }
                    return { ...col, tasks: newTasks };
                }
                return col;
            });
            return { ...prev, columns: newColumns };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        setActiveIntegration(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeIntegration) {
            const destColumn = kanbanData.columns.find(
                (col) =>
                    col.id === overId || col.tasks.some((t) => t.id === overId)
            );
            if (destColumn) {
                const newTask: Task = {
                    id: `task-${Date.now()}`,
                    title: activeIntegration.title,
                    time: "9:00 am",
                    duration: "1:00",
                    tag: "#work",
                    tagColor: "orange",
                    integration: activeIntegration.source,
                    integrationData: activeIntegration,
                };
                setKanbanData((prev) => ({
                    ...prev,
                    columns: prev.columns.map((col) =>
                        col.id === destColumn.id
                            ? { ...col, tasks: [...col.tasks, newTask] }
                            : col
                    ),
                }));
                setIntegrations((prev) =>
                    prev.filter((i) => i.id !== activeId)
                );
            }
            return;
        }

        const column = kanbanData.columns.find((col) =>
            col.tasks.some((task) => task.id === activeId)
        );
        if (column) {
            const oldIndex = column.tasks.findIndex((t) => t.id === activeId);
            const newIndex = column.tasks.findIndex((t) => t.id === overId);
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                setKanbanData((prev) => ({
                    ...prev,
                    columns: prev.columns.map((col) =>
                        col.id === column.id
                            ? {
                                  ...col,
                                  tasks: arrayMove(
                                      col.tasks,
                                      oldIndex,
                                      newIndex
                                  ),
                              }
                            : col
                    ),
                }));
            }
        }
    };

    const handleAddTask = (columnId: string) => {
        setSelectedColumnId(columnId);
        setIsTaskModalOpen(true);
    };

    const handleTaskClick = (task: Task | IntegrationCard) => {
        setSelectedTask(task);
        setIsDetailPanelOpen(true);
    };

    const handleCreateTask = (task: Omit<Task, "id">) => {
        if (!selectedColumnId) return;
        const newTask: Task = {
            ...task,
            id: `task-${Date.now()}`,
        };
        setKanbanData((prev) => ({
            ...prev,
            columns: prev.columns.map((col) =>
                col.id === selectedColumnId
                    ? { ...col, tasks: [...col.tasks, newTask] }
                    : col
            ),
        }));
        setIsTaskModalOpen(false);
    };

    const handleViewChange = (
        view: "kanban" | "today" | "focus" | "daily-planner"
    ) => {
        if (view === "daily-planner") {
            setShowDailyPlanner(true);
        } else if (view === "focus") {
            setCurrentView("focus");
        } else {
            setCurrentView(view);
        }
    };

    const todayTasks = kanbanData.columns[0]?.tasks || [];

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="h-screen w-full flex bg-background overflow-hidden font-sans font-light">
                {/* Mobile menu buttons */}
                <button
                    onClick={() => setLeftSidebarOpen(true)}
                    className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border shadow-sm"
                >
                    <Menu className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setRightSidebarOpen(true)}
                    className="xl:hidden fixed top-3 right-3 z-50 p-2 rounded-md bg-card border border-border shadow-sm"
                >
                    <PanelRightClose className="w-4 h-4" />
                </button>

                {/* Left Sidebar */}
                <div
                    className={`fixed lg:relative inset-y-0 left-0 z-40 w-[260px] transform transition-transform duration-200 ease-out lg:translate-x-0 ${
                        leftSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <LeftSidebar
                        onClose={() => setLeftSidebarOpen(false)}
                        onViewChange={handleViewChange}
                        currentView={currentView}
                    />
                </div>

                {leftSidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-30 animate-fade-in"
                        onClick={() => setLeftSidebarOpen(false)}
                    />
                )}

                {/* Center Content */}
                <div className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {currentView === "kanban" && (
                            <motion.div
                                key="kanban"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <KanbanBoard
                                    data={kanbanData}
                                    onAddTask={handleAddTask}
                                    onTaskClick={handleTaskClick}
                                />
                            </motion.div>
                        )}
                        {currentView === "today" && (
                            <motion.div
                                key="today"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <TodayView
                                    tasks={todayTasks}
                                    onTaskClick={handleTaskClick}
                                    onAddTask={() => {
                                        setSelectedColumnId(
                                            kanbanData.columns[0]?.id || null
                                        );
                                        setIsTaskModalOpen(true);
                                    }}
                                />
                            </motion.div>
                        )}
                        {currentView === "daily-planner" && (
                            <motion.div
                                key="daily-planner"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <DailyPlanner
                                    onClose={() => setShowDailyPlanner(false)}
                                />
                            </motion.div>
                        )}
                        {currentView === "focus" && (
                            <motion.div
                                key="focus"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="h-full"
                            >
                                <FocusMode
                                    task={focusTask}
                                    onClose={() => setCurrentView("kanban")}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Sidebar */}
                {currentView === "kanban" && (
                    <div
                        className={`fixed xl:relative inset-y-0 right-0 z-40 w-[320px] transform transition-transform duration-200 ease-out xl:translate-x-0 ${
                            rightSidebarOpen
                                ? "translate-x-0"
                                : "translate-x-full"
                        }`}
                    >
                        <RightSidebar
                            integrations={integrations}
                            onCardClick={handleTaskClick}
                            onClose={() => setRightSidebarOpen(false)}
                        />
                    </div>
                )}

                {rightSidebarOpen && currentView === "kanban" && (
                    <div
                        className="xl:hidden fixed inset-0 bg-black/50 z-30 animate-fade-in"
                        onClick={() => setRightSidebarOpen(false)}
                    />
                )}
            </div>

            <DragOverlay
                dropAnimation={{
                    duration: 200,
                    easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}
            >
                {activeTask && (
                    <motion.div
                        initial={{
                            scale: 1,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                        animate={{
                            scale: 1.03,
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                        }}
                        className="bg-card border border-border rounded p-3 w-[260px] cursor-grabbing"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium">
                                {activeTask.time}
                            </span>
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                                {activeTask.duration}
                            </span>
                        </div>
                        <p className="text-[13px] font-medium mt-1.5">
                            {activeTask.title}
                        </p>
                    </motion.div>
                )}
                {activeIntegration && (
                    <motion.div
                        initial={{
                            scale: 1,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                        animate={{
                            scale: 1.03,
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                        }}
                        className="bg-card border border-border rounded p-3 w-[240px] cursor-grabbing"
                    >
                        <p className="text-[13px] font-medium">
                            {activeIntegration.title}
                        </p>
                    </motion.div>
                )}
            </DragOverlay>

            {/* Task Creation Modal */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onCreateTask={handleCreateTask}
            />

            {/* Task Detail Panel */}
            <TaskDetailPanel
                isOpen={isDetailPanelOpen}
                onClose={() => setIsDetailPanelOpen(false)}
                task={selectedTask}
            />
        </DndContext>
    );
}
