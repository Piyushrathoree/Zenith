
import { create } from 'zustand';
import { toast } from 'sonner';
import { Task, Column, DailyTask, IntegrationType, GitHubIssue, GitHubPR, GmailMessage, NotionPage } from '@/types';
import { addDays, format, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { FilterTag, FilterStatus } from '@/components/dashboard/kanban/FilterDropdown';
import { ApiRequestError } from '@/lib/api/client';
import {
    createTask,
    deleteTaskRequest,
    getAllChannels,
    getAllTasks,
    createChannelRequest,
    getTodaysPlan,
    updateDailyPlanner,
    updateTaskRequest,
    runRollover,
    ServerChannel,
} from '@/lib/api/planner';
import {
    mapCompletedToStatusPayload,
    mapToClientDailyTask,
    mapToClientTask,
    mapToCreateDailyServerTaskPayload,
    mapToCreateServerTaskPayload,
    mapToUpdateServerTaskPayload,
    mergeServerTaskUpdate,
    toIsoString,
} from '@/lib/api/plannerMapping';
import {
    ConnectedIntegration,
    IntegrationFetchError,
    IntegrationProvider,
    ProviderInfo,
    disconnectIntegration as disconnectIntegrationRequest,
    getIntegrationItems,
    listConnectedIntegrations,
    listProviders,
    startProviderConnect,
    updateIntegrationSettings as updateIntegrationSettingsRequest,
    hideIntegrationItem as hideIntegrationItemRequest,
    type IntegrationSettings,
    type UniversalTask,
} from '@/lib/api/integrations';
import { externalIdOf, itemKey, sourceOf, taskInputFromItem, taskKey, type IntegrationItem } from '@/lib/integrationTasks';
import { mapIntegrationItems } from '@/lib/api/integrationsMapping';
import {
    getCurrentWeek,
    updateWeeklyPlan,
    type UpdateWeeklyPlanPayload,
    type WeeklyCurrentResponse,
    type WeeklyReflection,
    type WeeklyStatsDTO,
} from '@/lib/api/weekly';
import { getDailySummary } from '@/lib/api/rituals';
import {
    createRecurring,
    listRecurring,
    stopRecurring,
    updateRecurring,
    type RecurringInput,
    type RecurringRuleDTO,
    type RecurringUpdate,
} from '@/lib/api/recurring';

export type ViewMode = 'board' | 'calendar' | 'day';

/**
 * A weekly goal, as shown in WeeklyRitualsPanel.tsx. Saved on the server as
 * part of the WeeklyPlan for the current week (see lib/api/weekly.ts).
 */
export interface WeeklyGoal {
    id: string;
    title: string;
    progress: number;
    target: number;
}

// Browser only storage used before weekly planning moved to the server.
// Read once by migrateLegacyWeeklyRituals, then removed.
const LEGACY_WEEKLY_RITUALS_KEY = "zenith_weekly_rituals";

/** The week key the old localStorage version used (Sunday start, browser clock). */
function legacyWeekKey(): string {
    return format(startOfWeek(new Date()), "yyyy-MM-dd");
}

/**
 * One time upload of goals saved by the old localStorage version. Only goals
 * from the current week are uploaded, and only when the server has nothing yet
 * for that week. The old key is removed once the upload succeeds, or straight
 * away when there is nothing worth uploading.
 */
async function migrateLegacyWeeklyRituals(
    serverIsEmpty: boolean,
    save: (payload: UpdateWeeklyPlanPayload) => Promise<boolean>
): Promise<void> {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEGACY_WEEKLY_RITUALS_KEY);
    if (!raw) return;

    let legacy: { weekKey?: string; weeklyGoals?: WeeklyGoal[]; weeklyPriorities?: string[] } = {};
    try {
        legacy = JSON.parse(raw);
    } catch {
        // Unreadable old value: nothing to keep, so it is dropped below.
    }

    const goals = Array.isArray(legacy.weeklyGoals) ? legacy.weeklyGoals : [];
    const priorities = Array.isArray(legacy.weeklyPriorities) ? legacy.weeklyPriorities : [];
    const isCurrentWeek = legacy.weekKey === legacyWeekKey();
    const hasContent = goals.length > 0 || priorities.length > 0;

    if (!(isCurrentWeek && hasContent && serverIsEmpty)) {
        window.localStorage.removeItem(LEGACY_WEEKLY_RITUALS_KEY);
        return;
    }

    const saved = await save({ goals, priorities });
    if (saved) window.localStorage.removeItem(LEGACY_WEEKLY_RITUALS_KEY);
}

export type IntegrationDetailType =
    | { type: 'github-issue'; data: GitHubIssue }
    | { type: 'github-pr'; data: GitHubPR }
    | { type: 'gmail'; data: GmailMessage }
    | { type: 'notion'; data: NotionPage }
    | null;

// The client's tag chips double as the server's task channels - see the
// mapping decisions documented at the top of lib/api/plannerMapping.ts.
const DEFAULT_CHANNEL_NAMES: Task['tag'][] = ['work', 'personal', 'health'];

function todayDateKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

/** Extracts a human readable message out of whatever a failed request throws. */
function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiRequestError) return error.message || fallback;
    if (error instanceof Error) return error.message || fallback;
    return fallback;
}

/** Temp ids are used for optimistic rows that have not been persisted yet. */
function isTempId(id: string): boolean {
    return id.startsWith('temp-');
}

interface AppState {
    tasks: Task[];
    dailyTasks: DailyTask[];
    columns: Column[];
    channels: ServerChannel[];
    isPlannerLoading: boolean;
    plannerLoaded: boolean;
    plannerError: string | null;
    // The day the board was last loaded for, as "yyyy-MM-dd". Used to notice a new day.
    plannerDateKey: string;
    activeIntegration: IntegrationType;
    selectedTask: Task | null;
    showTaskModal: boolean;
    showCreateModal: boolean;
    createTaskDate: string | null;
    showDailyPlanner: boolean;
    showWeeklyRituals: boolean;
    weeklyRitualType: 'planning' | 'review';
    focusMode: boolean;
    focusMinimized: boolean;
    focusTask: Task | null;
    focusTitle: string;
    focusTimeLeft: number;
    focusRunning: boolean;
    focusDurationMin: number;
    githubIssues: GitHubIssue[];
    githubPRs: GitHubPR[];
    gmailMessages: GmailMessage[];
    notionPages: NotionPage[];
    connectedIntegrations: ConnectedIntegration[];
    availableProviders: ProviderInfo[];
    integrationErrors: IntegrationFetchError[];
    // Raw items as the server sent them (the typed arrays above are derived for the cards).
    integrationItems: UniversalTask[];
    integrationCursors: Partial<Record<IntegrationProvider, string>>;
    loadingMoreProvider: IntegrationProvider | null;
    isIntegrationsLoading: boolean;
    integrationsLoaded: boolean;
    integrationsError: string | null;
    isIntegrationsRefreshing: boolean;
    integrationTab: 'issues' | 'prs' | 'reviews';
    viewMode: ViewMode;
    // The day shown in the Day view (time boxing), as "yyyy-MM-dd".
    dayViewDate: string;
    boardJumpDate: string | null;
    boardJumpNonce: number;
    highlightedColumnDate: string | null;
    filterTags: FilterTag[];
    filterStatus: FilterStatus;
    selectedIntegrationDetail: IntegrationDetailType;
    showIntegrationModal: boolean;
    // Weekly planning for the current week. Saved on the server (see loadWeeklyPlan).
    weeklyWeekKey: string;
    weeklyGoals: WeeklyGoal[];
    weeklyPriorities: string[];
    weeklyReviewNotes: string;
    weeklyStats: WeeklyStatsDTO | null;
    weeklyPreviousStats: WeeklyStatsDTO | null;
    weeklyLoaded: boolean;
    weeklyReflection: WeeklyReflection;
    weeklyPlanningCompletedAt: string | null;
    weeklyReviewCompletedAt: string | null;
    // Guided daily rituals (Phase 8). Which flow is open, and today's markers.
    dailyRitual: 'planning' | 'shutdown' | null;
    todayRitual: { plannedAt: string | null; shutdownAt: string | null };
    showHighlights: boolean;
    // Backlog: tasks with no day. Listed in the Backlog panel, never on the board.
    backlogTasks: Task[];
    showBacklog: boolean;
    // Repeating task templates. Each one generates tasks on the board.
    recurringRules: RecurringRuleDTO[];

    // Actions
    setActiveIntegration: (integration: IntegrationType) => void;
    setSelectedTask: (task: Task | null) => void;
    setShowTaskModal: (show: boolean) => void;
    setShowCreateModal: (show: boolean, date?: string) => void;
    setShowDailyPlanner: (show: boolean) => void;
    setShowWeeklyRituals: (show: boolean, type?: 'planning' | 'review') => void;
    setFocusMode: (focus: boolean) => void;
    setFocusTask: (task: Task | null) => void;
    setFocusTitle: (title: string) => void;
    setFocusDurationMin: (minutes: number) => void;
    setFocusRunning: (running: boolean) => void;
    tickFocus: () => void;
    resetFocusTimer: () => void;
    minimizeFocus: () => void;
    exitFocus: () => void;
    setIntegrationTab: (tab: 'issues' | 'prs' | 'reviews') => void;
    setViewMode: (mode: ViewMode) => void;
    setDayViewDate: (date: string) => void;
    jumpToDate: (date: string) => void;
    clearColumnHighlight: () => void;
    setFilterTags: (tags: FilterTag[]) => void;
    setFilterStatus: (status: FilterStatus) => void;
    setSelectedIntegrationDetail: (detail: IntegrationDetailType) => void;
    setShowIntegrationModal: (show: boolean) => void;
    openIntegrationDetail: (detail: IntegrationDetailType) => void;
    /** Fetches tasks + channels + today's daily plan from the backend and hydrates the store. */
    loadInitialData: () => Promise<void>;
    /** Fetches providers + connected integrations + items from the backend and hydrates the store. */
    loadIntegrations: () => Promise<void>;
    /** Re-fetches items only, bypassing the server cache, for the panel's refresh button. */
    refreshIntegrationItems: () => Promise<void>;
    refreshIntegrationProvider: (provider: IntegrationProvider) => Promise<void>;
    loadMoreIntegrationItems: (provider: IntegrationProvider) => Promise<void>;
    saveIntegrationSettings: (provider: IntegrationProvider, settings: Partial<IntegrationSettings>) => Promise<void>;
    /** One click add from the integration panel: today, tomorrow, a "yyyy-MM-dd" day, or the backlog. */
    addIntegrationItem: (item: IntegrationItem, target: 'today' | 'tomorrow' | 'backlog' | string) => Promise<void>;
    /** Hide an item from the panel; with `snooze`, it comes back tomorrow morning. */
    hideIntegrationItem: (item: IntegrationItem, snooze?: boolean) => Promise<void>;
    connectIntegration: (provider: IntegrationProvider) => Promise<void>;
    disconnectIntegration: (provider: IntegrationProvider) => Promise<void>;
    addTask: (task: Omit<Task, 'id'>) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, newDate: string) => Promise<void>;
    toggleDailyTask: (id: string) => Promise<void>;
    addDailyTask: (task: Omit<DailyTask, 'id'>) => Promise<void>;
    // Backlog actions. Changes are optimistic and rolled back if the save fails.
    setShowBacklog: (show: boolean) => void;
    setDailyRitual: (ritual: 'planning' | 'shutdown' | null) => void;
    setShowHighlights: (show: boolean) => void;
    loadTodayRitual: () => Promise<void>;
    addBacklogTask: (input: { title: string; tag: Task['tag']; duration: string }) => Promise<void>;
    sendToBacklog: (id: string) => Promise<void>;
    scheduleFromBacklog: (id: string, date: string, time?: string) => Promise<void>;
    // Repeating tasks. The server decides which days get tasks, so these reload from the server.
    loadRecurringRules: () => Promise<void>;
    createRecurringTask: (input: RecurringInput) => Promise<void>;
    updateRecurringSeries: (id: string, input: RecurringUpdate) => Promise<void>;
    stopRecurringSeries: (id: string) => Promise<void>;
    reloadTasks: () => Promise<void>;
    // Weekly planning actions. Changes are optimistic and rolled back if the save fails.
    loadWeeklyPlan: () => Promise<void>;
    saveWeeklyPlan: (payload: UpdateWeeklyPlanPayload) => Promise<boolean>;
    setWeeklyReviewNotes: (notes: string) => void;
    addWeeklyGoal: (title: string) => void;
    removeWeeklyGoal: (id: string) => void;
    updateWeeklyGoalProgress: (id: string, increment: number) => void;
    addWeeklyPriority: (text: string) => void;
    removeWeeklyPriority: (index: number) => void;
    // Selector-like helper
    getFilteredTasks: () => Task[];
}

function generateColumns(): Column[] {
    const columns: Column[] = [];
    const start = startOfDay(new Date());

    for (let i = 0; i < 14; i++) {
        const date = addDays(start, i);
        columns.push({
            id: format(date, 'yyyy-MM-dd'),
            date,
            tasks: [],
        });
    }

    return columns;
}

export const useStore = create<AppState>((set, get) => ({
    // Planner data (tasks, daily tasks, channels) starts empty and is
    // populated by loadInitialData() once the user is authenticated - see
    // components/auth/RequireAuth.tsx. If the backend is unreachable this
    // simply stays empty rather than crashing the app (see loadInitialData).
    tasks: [],
    dailyTasks: [],
    columns: generateColumns(),
    channels: [],
    isPlannerLoading: false,
    plannerLoaded: false,
    plannerError: null,
    plannerDateKey: '',
    activeIntegration: null,
    selectedTask: null,
    showTaskModal: false,
    showCreateModal: false,
    createTaskDate: null,
    showDailyPlanner: false,
    showWeeklyRituals: false,
    weeklyRitualType: 'planning',
    focusMode: false,
    focusMinimized: false,
    focusTask: null,
    focusTitle: "",
    focusTimeLeft: 25 * 60,
    focusRunning: false,
    focusDurationMin: 25,
    // Integration data starts empty and is populated by loadIntegrations()
    // once the user is authenticated, the same way the planner slice above
    // is populated by loadInitialData() - see components/auth/RequireAuth.tsx.
    githubIssues: [],
    githubPRs: [],
    gmailMessages: [],
    notionPages: [],
    connectedIntegrations: [],
    availableProviders: [],
    integrationErrors: [],
    integrationItems: [],
    integrationCursors: {},
    loadingMoreProvider: null,
    isIntegrationsLoading: false,
    integrationsLoaded: false,
    integrationsError: null,
    isIntegrationsRefreshing: false,
    integrationTab: 'issues',
    viewMode: 'board',
    dayViewDate: todayDateKey(),
    boardJumpDate: null,
    boardJumpNonce: 0,
    highlightedColumnDate: null,
    filterTags: ['all'],
    filterStatus: 'all',
    selectedIntegrationDetail: null,
    showIntegrationModal: false,
    // Weekly planning is filled by loadWeeklyPlan() once the user is authenticated.
    weeklyWeekKey: '',
    weeklyGoals: [],
    weeklyPriorities: [],
    weeklyReviewNotes: '',
    weeklyStats: null,
    weeklyPreviousStats: null,
    weeklyLoaded: false,
    backlogTasks: [],
    showBacklog: false,
    weeklyReflection: { wentWell: '', didnt: '', change: '' },
    weeklyPlanningCompletedAt: null,
    weeklyReviewCompletedAt: null,
    dailyRitual: null,
    todayRitual: { plannedAt: null, shutdownAt: null },
    showHighlights: false,
    recurringRules: [],

    // Only one docked side panel at a time: opening an integration closes the backlog.
    setActiveIntegration: (integration) => set({
        activeIntegration: integration,
        ...(integration ? { showBacklog: false, showHighlights: false } : {}),
    }),
    setSelectedTask: (task) => set({ selectedTask: task }),
    setShowTaskModal: (show) => set({ showTaskModal: show }),
    setShowCreateModal: (show, date) =>
        set({
            showCreateModal: show,
            createTaskDate: show ? date ?? format(new Date(), "yyyy-MM-dd") : null,
        }),
    setShowDailyPlanner: (show) => set({ showDailyPlanner: show }),
    setShowWeeklyRituals: (show, type) => {
        set((state) => ({
            showWeeklyRituals: show,
            weeklyRitualType: type || state.weeklyRitualType,
        }));
        // Refresh from the server each time the panel opens, so the stats are current.
        if (show) void get().loadWeeklyPlan();
    },
    setFocusMode: (focus) => set((state) => ({
        focusMode: focus,
        focusMinimized: focus ? false : state.focusRunning,
    })),
    setFocusTask: (task) => set({
        focusTask: task,
        focusTitle: task?.title ?? "",
    }),
    setFocusTitle: (title) => set({ focusTitle: title, focusTask: null }),
    setFocusDurationMin: (minutes) => set((state) => ({
        focusDurationMin: minutes,
        focusTimeLeft: state.focusRunning ? state.focusTimeLeft : minutes * 60,
        focusRunning: state.focusRunning ? state.focusRunning : false,
    })),
    setFocusRunning: (running) => set({ focusRunning: running }),
    tickFocus: () => set((state) => {
        if (!state.focusRunning) return state;
        if (state.focusTimeLeft <= 1) {
            return { focusTimeLeft: 0, focusRunning: false };
        }
        return { focusTimeLeft: state.focusTimeLeft - 1 };
    }),
    resetFocusTimer: () => set((state) => ({
        focusTimeLeft: state.focusDurationMin * 60,
        focusRunning: false,
    })),
    minimizeFocus: () => set({ focusMode: false, focusMinimized: true }),
    exitFocus: () => set((state) => ({
        focusMode: false,
        focusMinimized: false,
        focusRunning: false,
        focusTimeLeft: state.focusDurationMin * 60,
        focusTask: null,
        focusTitle: "",
    })),
    setIntegrationTab: (tab) => set({ integrationTab: tab }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setDayViewDate: (date) => set({ dayViewDate: date }),
    jumpToDate: (date) =>
        set((state) => ({
            viewMode: 'board',
            boardJumpDate: date,
            boardJumpNonce: state.boardJumpNonce + 1,
            highlightedColumnDate: date,
        })),
    clearColumnHighlight: () => set({ highlightedColumnDate: null }),
    setFilterTags: (tags) => set({ filterTags: tags }),
    setFilterStatus: (status) => set({ filterStatus: status }),
    setSelectedIntegrationDetail: (detail) => set({ selectedIntegrationDetail: detail }),
    setShowIntegrationModal: (show) => set({ showIntegrationModal: show }),

    openIntegrationDetail: (detail) => {
        set({ selectedIntegrationDetail: detail, showIntegrationModal: true });
    },

    loadInitialData: async () => {
        if (get().isPlannerLoading) return;
        set({ isPlannerLoading: true, plannerError: null });

        try {
            // Carry unfinished tasks forward before reading the board. Non fatal: the scheduled
            // job rolls over later anyway, so a failure here only means a slightly stale board.
            try {
                const rollover = await runRollover();
                if (rollover.rolledCount > 0) {
                    toast(`Moved ${rollover.rolledCount} unfinished ${rollover.rolledCount === 1 ? 'task' : 'tasks'} to today`);
                }
                if (rollover.backlogCount > 0) {
                    toast(`${rollover.backlogCount} ${rollover.backlogCount === 1 ? 'task' : 'tasks'} from last week moved to your backlog`);
                }
            } catch {
                // Non fatal, see above.
            }

            // Make sure the three tag channels exist server side. Failures here
            // are non fatal - the board still works purely off `due`/`status`
            // even if the Channel documents themselves could not be created.
            let channels: ServerChannel[] = [];
            try {
                channels = await getAllChannels();
                const existingNames = new Set(channels.map((c) => c.name));
                const missing = DEFAULT_CHANNEL_NAMES.filter((name) => !existingNames.has(name));
                if (missing.length > 0) {
                    const created = await Promise.allSettled(
                        missing.map((name) => createChannelRequest({ name }))
                    );
                    const newChannels = created
                        .filter((r): r is PromiseFulfilledResult<ServerChannel> => r.status === 'fulfilled')
                        .map((r) => r.value);
                    channels = [...channels, ...newChannels];
                }
            } catch {
                // Channel bootstrapping is best effort - swallow and continue.
                channels = [];
            }

            const serverTasks = await getAllTasks();

            let dailyTasks: DailyTask[] = [];
            try {
                const plan = await getTodaysPlan();
                dailyTasks = plan.tasks.map(mapToClientDailyTask);
            } catch (error) {
                // 404 just means no plan exists for today yet - that is not an
                // error state, the daily planner starts empty until the user
                // adds a ritual (which upserts the plan).
                if (!(error instanceof ApiRequestError && error.statusCode === 404)) {
                    throw error;
                }
                dailyTasks = [];
            }

            const mappedTasks = serverTasks.map(mapToClientTask);
            set({
                tasks: mappedTasks.filter((task) => !task.inBacklog),
                backlogTasks: mappedTasks.filter((task) => task.inBacklog),
                // Rebuilt on every load, so a tab opened yesterday starts on today.
                columns: generateColumns(),
                plannerDateKey: todayDateKey(),
                dailyTasks,
                channels,
                isPlannerLoading: false,
                plannerLoaded: true,
                plannerError: null,
            });
        } catch (error) {
            const message = getErrorMessage(error, 'Could not load your planner data');
            set({ isPlannerLoading: false, plannerLoaded: true, plannerError: message });
            toast.error(`${message}. Showing an empty board until the connection is restored.`);
        }
    },

    loadIntegrations: async () => {
        if (get().isIntegrationsLoading) return;
        set({ isIntegrationsLoading: true, integrationsError: null });

        // Promise.allSettled rather than Promise.all: a free plan user gets a
        // 403 back from all three of these endpoints, since the server gates
        // integrations behind Pro (see featureGate.middleware.ts). With
        // Promise.all only the first rejection is observed and the other two
        // become unhandled promise rejections logged to the console on every
        // free plan dashboard load, even though the outcome (an empty,
        // gated panel) is the same either way. Settling all three lets us
        // tell that normal gated case apart from a genuine failure, and lets
        // a partial success (e.g. providers and items load but the connected
        // list request drops) still render instead of being thrown away.
        const [providersResult, connectedResult, itemsResult] = await Promise.allSettled([
            listProviders(),
            listConnectedIntegrations(),
            getIntegrationItems(),
        ]);
        const results = [providersResult, connectedResult, itemsResult];

        const isForbidden = (result: PromiseSettledResult<unknown>) =>
            result.status === 'rejected' &&
            result.reason instanceof ApiRequestError &&
            result.reason.statusCode === 403;

        if (results.every(isForbidden)) {
            // Normal gated free plan state - renders as an empty integrations
            // panel with no toast, mirrors the 404 handling for a missing
            // daily plan in loadInitialData above.
            set({
                availableProviders: [],
                connectedIntegrations: [],
                integrationErrors: [],
                githubIssues: [],
                githubPRs: [],
                gmailMessages: [],
                notionPages: [],
                isIntegrationsLoading: false,
                integrationsLoaded: true,
                integrationsError: null,
            });
            return;
        }

        const genuineFailure = results.find(
            (result): result is PromiseRejectedResult => result.status === 'rejected' && !isForbidden(result)
        );

        if (genuineFailure) {
            const message = getErrorMessage(genuineFailure.reason, 'Could not load your integrations');
            set({ isIntegrationsLoading: false, integrationsLoaded: true, integrationsError: message });
            toast.error(`${message}. Showing an empty integrations panel until the connection is restored.`);
            return;
        }

        // Everything that did not succeed here is a gated 403, never a
        // genuine error - use whatever came back and treat the rest as
        // empty rather than discarding a partial result.
        const mapped = itemsResult.status === 'fulfilled'
            ? mapIntegrationItems(itemsResult.value.items)
            : { githubIssues: [], githubPRs: [], gmailMessages: [], notionPages: [] };

        set({
            integrationItems: itemsResult.status === 'fulfilled' ? itemsResult.value.items : [],
            integrationCursors: itemsResult.status === 'fulfilled' ? itemsResult.value.nextCursors ?? {} : {},
            availableProviders: providersResult.status === 'fulfilled' ? providersResult.value : [],
            connectedIntegrations: connectedResult.status === 'fulfilled' ? connectedResult.value : [],
            integrationErrors: itemsResult.status === 'fulfilled' ? itemsResult.value.errors : [],
            githubIssues: mapped.githubIssues,
            githubPRs: mapped.githubPRs,
            gmailMessages: mapped.gmailMessages,
            notionPages: mapped.notionPages,
            isIntegrationsLoading: false,
            integrationsLoaded: true,
            integrationsError: null,
        });
    },

    refreshIntegrationItems: async () => {
        set({ isIntegrationsRefreshing: true });

        try {
            const itemsResponse = await getIntegrationItems(true);
            const mapped = mapIntegrationItems(itemsResponse.items);
            set({
                integrationItems: itemsResponse.items,
                integrationCursors: itemsResponse.nextCursors ?? {},
                githubIssues: mapped.githubIssues,
                githubPRs: mapped.githubPRs,
                gmailMessages: mapped.gmailMessages,
                notionPages: mapped.notionPages,
                integrationErrors: itemsResponse.errors,
            });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh your integrations'));
        } finally {
            set({ isIntegrationsRefreshing: false });
        }
    },

    connectIntegration: async (provider) => {
        // startProviderConnect() navigates the browser away to the provider's
        // consent screen on success, so there is nothing to set in state here.
        // If the request itself fails, that navigation never happens, so the
        // user needs a toast or they would otherwise see nothing at all.
        try {
            await startProviderConnect(provider);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not start the connection'));
        }
    },

    disconnectIntegration: async (provider) => {
        const previousConnectedIntegrations = get().connectedIntegrations;
        const previousGithubIssues = get().githubIssues;
        const previousGithubPRs = get().githubPRs;
        const previousGmailMessages = get().gmailMessages;
        const previousNotionPages = get().notionPages;

        set((state) => ({
            connectedIntegrations: state.connectedIntegrations.filter((c) => c.provider !== provider),
            integrationItems: state.integrationItems.filter((item) => item.provider !== provider),
            githubIssues: provider === 'github' ? [] : state.githubIssues,
            githubPRs: provider === 'github' ? [] : state.githubPRs,
            gmailMessages: provider === 'gmail' ? [] : state.gmailMessages,
            notionPages: provider === 'notion' ? [] : state.notionPages,
        }));

        try {
            await disconnectIntegrationRequest(provider);
            toast.success(`Disconnected ${provider}`);
        } catch (error) {
            set({
                connectedIntegrations: previousConnectedIntegrations,
                githubIssues: previousGithubIssues,
                githubPRs: previousGithubPRs,
                gmailMessages: previousGmailMessages,
                notionPages: previousNotionPages,
            });
            toast.error(getErrorMessage(error, 'Could not disconnect the integration'));
        }
    },

    refreshIntegrationProvider: async (provider) => {
        set({ isIntegrationsRefreshing: true });
        try {
            const [response, connected] = await Promise.all([
                getIntegrationItems(true, { provider }),
                listConnectedIntegrations().catch(() => get().connectedIntegrations),
            ]);
            const raw = [...get().integrationItems.filter((item) => item.provider !== provider), ...response.items];
            set({
                ...mapIntegrationItems(raw),
                integrationItems: raw,
                integrationErrors: [
                    ...get().integrationErrors.filter((e) => e.provider !== provider),
                    ...response.errors,
                ],
                integrationCursors: { ...get().integrationCursors, [provider]: response.nextCursors?.[provider] },
                connectedIntegrations: connected,
            });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not refresh this integration'));
        } finally {
            set({ isIntegrationsRefreshing: false });
        }
    },

    loadMoreIntegrationItems: async (provider) => {
        const cursor = get().integrationCursors[provider];
        if (!cursor || get().loadingMoreProvider) return;
        set({ loadingMoreProvider: provider });
        try {
            const response = await getIntegrationItems(false, { provider, cursor });
            const seen = new Set(get().integrationItems.map((item) => `${item.provider}:${item.externalId}`));
            const raw = [
                ...get().integrationItems,
                ...response.items.filter((item) => !seen.has(`${item.provider}:${item.externalId}`)),
            ];
            set({
                ...mapIntegrationItems(raw),
                integrationItems: raw,
                integrationCursors: { ...get().integrationCursors, [provider]: response.nextCursors?.[provider] },
            });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not load more items'));
        } finally {
            set({ loadingMoreProvider: null });
        }
    },

    saveIntegrationSettings: async (provider, settings) => {
        try {
            const updated = await updateIntegrationSettingsRequest(provider, settings);
            set((state) => ({
                connectedIntegrations: state.connectedIntegrations.map((entry) =>
                    entry.provider === provider ? { ...entry, ...updated } : entry
                ),
            }));
            await get().refreshIntegrationProvider(provider);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not save these settings'));
        }
    },

    hideIntegrationItem: async (item, snooze) => {
        const provider = sourceOf(item);
        const externalId = externalIdOf(item);
        const previous = get().integrationItems;
        const remaining = previous.filter((raw) => !(raw.provider === provider && raw.externalId === externalId));
        set({ ...mapIntegrationItems(remaining), integrationItems: remaining });

        // Snooze until 8:00 tomorrow, local time.
        const until = snooze
            ? (() => {
                const morning = addDays(startOfDay(new Date()), 1);
                morning.setHours(8);
                return morning.toISOString();
            })()
            : undefined;
        try {
            await hideIntegrationItemRequest(provider, externalId, until);
            toast(snooze ? 'Snoozed until tomorrow' : 'Hidden from this list');
        } catch (error) {
            set({ ...mapIntegrationItems(previous), integrationItems: previous });
            toast.error(getErrorMessage(error, 'Could not hide that item'));
        }
    },

    addIntegrationItem: async (item, target) => {
        // Never plan the same item twice: point at the existing task instead.
        const key = itemKey(item);
        const existing = [...get().tasks, ...get().backlogTasks].find((task) => taskKey(task) === key);
        if (existing) {
            toast(existing.inBacklog
                ? 'Already in your backlog'
                : `Already planned for ${format(parseISO(existing.date), 'EEE, MMM d')}`);
            return;
        }

        const date = target === 'backlog'
            ? ''
            : target === 'today'
                ? todayDateKey()
                : target === 'tomorrow'
                    ? format(addDays(new Date(), 1), 'yyyy-MM-dd')
                    : target;
        const input = taskInputFromItem(item, date);

        if (date) {
            await get().addTask(input);
            toast.success(target === 'today' ? 'Added to today' : `Added to ${format(parseISO(date), 'EEE, MMM d')}`);
            return;
        }

        // Backlog: same optimistic pattern as addBacklogTask, keeping the provenance fields.
        const tempId = `temp-${Date.now()}`;
        set((state) => ({ backlogTasks: [{ ...input, id: tempId }, ...state.backlogTasks] }));
        const { channel, payload } = mapToCreateServerTaskPayload(input);
        try {
            const created = await createTask(channel, payload);
            const mapped = { ...mapToClientTask(created), sourceData: input.sourceData };
            set((state) => ({
                backlogTasks: state.backlogTasks.map((task) => (task.id === tempId ? mapped : task)),
            }));
            toast.success('Added to your backlog');
        } catch (error) {
            set((state) => ({ backlogTasks: state.backlogTasks.filter((task) => task.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not add to your backlog'));
        }
    },

    addTask: async (task) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask: Task = { ...task, id: tempId };
        set((state) => ({ tasks: [...state.tasks, optimisticTask] }));

        // mapToCreateServerTaskPayload now also forwards duration/startTime
        // (from task.duration / task.time), so a task created with a chosen
        // duration/time (see CreateTaskModal.tsx) persists across reload
        // instead of resetting to a hardcoded default - see plannerMapping.ts.
        const { channel, payload } = mapToCreateServerTaskPayload(task);
        // Carry provenance through to the server so a task dragged in from
        // the integration panel keeps its origin after a reload instead of
        // looking like it was typed from scratch - purely additive, a task
        // with none of these fields sends exactly the payload it always did.
        if (task.source) payload.source = task.source;
        if (task.externalId) payload.externalId = task.externalId;
        if (task.link) payload.link = task.link;
        try {
            const created = await createTask(channel, payload);
            const mapped = mapToClientTask(created);
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === tempId ? mapped : t)),
            }));
        } catch (error) {
            set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not create task'));
        }
    },

    updateTask: async (id, updates) => {
        // Backlog tasks live in backlogTasks. Giving one a day schedules it onto the board.
        if (get().backlogTasks.some((task) => task.id === id)) {
            if (updates.date) {
                await get().scheduleFromBacklog(id, updates.date, updates.time);
                return;
            }

            const previousBacklog = get().backlogTasks;
            const previousSelected = get().selectedTask;
            set((state) => ({
                backlogTasks: state.backlogTasks.map((task) =>
                    task.id === id ? { ...task, ...updates } : task
                ),
                selectedTask:
                    state.selectedTask?.id === id
                        ? { ...state.selectedTask, ...updates }
                        : state.selectedTask,
            }));

            if (isTempId(id)) return;
            const backlogPayload = mapToUpdateServerTaskPayload(updates);
            if (Object.keys(backlogPayload).length === 0) return;

            try {
                const updated = await updateTaskRequest(id, backlogPayload);
                set((state) => ({
                    backlogTasks: state.backlogTasks.map((task) =>
                        task.id === id ? mergeServerTaskUpdate(task, updated) : task
                    ),
                }));
            } catch (error) {
                set({ backlogTasks: previousBacklog, selectedTask: previousSelected });
                toast.error(getErrorMessage(error, 'Could not update task'));
            }
            return;
        }

        const previousTasks = get().tasks;
        const previousSelected = get().selectedTask;
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, ...updates } : task
            ),
            selectedTask:
                state.selectedTask?.id === id
                    ? { ...state.selectedTask, ...updates }
                    : state.selectedTask,
        }));

        // Optimistic rows still waiting on their create request cannot be
        // persisted yet - the create response will already carry `updates`
        // worth of data once it lands, or the row will roll back if it fails.
        if (isTempId(id)) return;

        // mapToUpdateServerTaskPayload now forwards updates.tag as `channel`
        // and updates.duration/updates.time as `duration`/`startTime`, so a
        // tag change (moving a task between work/personal/health) or a
        // duration/time edit persists to the backend and survives reload,
        // using the same optimistic-then-reconcile / rollback-on-failure
        // flow already in place below. moveTask() (date drag and drop) goes
        // through this same path with { date: newDate }.
        const payload = mapToUpdateServerTaskPayload(updates);
        if (Object.keys(payload).length === 0) return;

        try {
            const updated = await updateTaskRequest(id, payload);
            set((state) => {
                const merged = mergeServerTaskUpdate(
                    state.tasks.find((task) => task.id === id) ?? previousTasks.find((task) => task.id === id)!,
                    updated
                );
                return {
                    tasks: state.tasks.map((task) =>
                        task.id === id ? merged : task
                    ),
                    selectedTask:
                        state.selectedTask?.id === id ? merged : state.selectedTask,
                };
            });
        } catch (error) {
            set({ tasks: previousTasks, selectedTask: previousSelected });
            toast.error(getErrorMessage(error, 'Could not update task'));
        }
    },

    deleteTask: async (id) => {
        if (get().backlogTasks.some((task) => task.id === id)) {
            const previousBacklog = get().backlogTasks;
            const previousSelected = get().selectedTask;
            const previousShowModal = get().showTaskModal;
            set((state) => ({
                backlogTasks: state.backlogTasks.filter((task) => task.id !== id),
                ...(state.selectedTask?.id === id
                    ? { selectedTask: null, showTaskModal: false }
                    : {}),
            }));

            if (isTempId(id)) return;

            try {
                await deleteTaskRequest(id);
                toast.success('Task deleted');
            } catch (error) {
                set({
                    backlogTasks: previousBacklog,
                    selectedTask: previousSelected,
                    showTaskModal: previousShowModal,
                });
                toast.error(getErrorMessage(error, 'Could not delete task'));
            }
            return;
        }

        const previousTasks = get().tasks;
        const previousSelected = get().selectedTask;
        const previousShowModal = get().showTaskModal;
        set((state) => ({
            tasks: state.tasks.filter(task => task.id !== id),
            ...(state.selectedTask?.id === id
                ? { selectedTask: null, showTaskModal: false }
                : {}),
        }));

        if (isTempId(id)) return;

        try {
            await deleteTaskRequest(id);
            toast.success('Task deleted');
        } catch (error) {
            set({
                tasks: previousTasks,
                selectedTask: previousSelected,
                showTaskModal: previousShowModal,
            });
            toast.error(getErrorMessage(error, 'Could not delete task'));
        }
    },

    setShowBacklog: (show) => set({
        showBacklog: show,
        // Only one docked side panel at a time: opening the backlog closes the others.
        ...(show ? { activeIntegration: null, showHighlights: false } : {}),
    }),

    setDailyRitual: (ritual) => set({ dailyRitual: ritual }),

    setShowHighlights: (show) => set({
        showHighlights: show,
        ...(show ? { activeIntegration: null, showBacklog: false } : {}),
    }),

    loadTodayRitual: async () => {
        try {
            const summary = await getDailySummary(todayDateKey());
            set({ todayRitual: { plannedAt: summary.plannedAt, shutdownAt: summary.shutdownAt } });
        } catch {
            // Non fatal: the sidebar just shows no check marks.
        }
    },

    addBacklogTask: async ({ title, tag, duration }) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask: Task = {
            id: tempId,
            title,
            tag,
            duration,
            date: '',
            completed: false,
            inBacklog: true,
        };
        set((state) => ({ backlogTasks: [optimisticTask, ...state.backlogTasks] }));

        try {
            const created = await createTask(tag, { taskDescription: title, duration, inBacklog: true });
            const mapped = mapToClientTask(created);
            set((state) => ({
                backlogTasks: state.backlogTasks.map((task) => (task.id === tempId ? mapped : task)),
            }));
        } catch (error) {
            set((state) => ({ backlogTasks: state.backlogTasks.filter((task) => task.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not add to backlog'));
        }
    },

    sendToBacklog: async (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;

        const previousTasks = get().tasks;
        const previousBacklog = get().backlogTasks;
        const previousSelected = get().selectedTask;
        const previousShowModal = get().showTaskModal;
        set((state) => ({
            tasks: state.tasks.filter((item) => item.id !== id),
            backlogTasks: [{ ...task, date: '', time: undefined, inBacklog: true }, ...state.backlogTasks],
            ...(state.selectedTask?.id === id ? { selectedTask: null, showTaskModal: false } : {}),
        }));

        if (isTempId(id)) return;

        try {
            await updateTaskRequest(id, { inBacklog: true });
        } catch (error) {
            set({
                tasks: previousTasks,
                backlogTasks: previousBacklog,
                selectedTask: previousSelected,
                showTaskModal: previousShowModal,
            });
            toast.error(getErrorMessage(error, 'Could not move task to backlog'));
        }
    },

    scheduleFromBacklog: async (id, date, time) => {
        const task = get().backlogTasks.find((item) => item.id === id);
        if (!task) return;

        const due = toIsoString(date);
        if (!due) {
            toast.error('That day is not valid');
            return;
        }

        const previousTasks = get().tasks;
        const previousBacklog = get().backlogTasks;
        set((state) => ({
            backlogTasks: state.backlogTasks.filter((item) => item.id !== id),
            tasks: [...state.tasks, { ...task, date, time: time || undefined, inBacklog: false }],
        }));

        if (isTempId(id)) return;

        try {
            const updated = await updateTaskRequest(id, {
                inBacklog: false,
                due,
                ...(time ? { startTime: time } : {}),
            });
            set((state) => ({
                tasks: state.tasks.map((item) =>
                    item.id === id ? mergeServerTaskUpdate(item, updated) : item
                ),
            }));
        } catch (error) {
            set({ tasks: previousTasks, backlogTasks: previousBacklog });
            toast.error(getErrorMessage(error, 'Could not schedule task'));
        }
    },

    /** Re-reads every task from the server and splits out the backlog. */
    reloadTasks: async () => {
        const mapped = (await getAllTasks()).map(mapToClientTask);
        set({
            tasks: mapped.filter((task) => !task.inBacklog),
            backlogTasks: mapped.filter((task) => task.inBacklog),
        });
    },

    loadRecurringRules: async () => {
        try {
            set({ recurringRules: await listRecurring() });
        } catch {
            // Non fatal: the board still works, the repeat section just has nothing to show.
        }
    },

    createRecurringTask: async (input) => {
        try {
            const { createdCount } = await createRecurring(input);
            await Promise.all([get().loadRecurringRules(), get().reloadTasks()]);
            toast.success(
                createdCount > 0
                    ? `Repeating task created, ${createdCount} days scheduled`
                    : 'Repeating task created'
            );
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not create the repeating task'));
        }
    },

    updateRecurringSeries: async (id, input) => {
        try {
            await updateRecurring(id, input);
            await Promise.all([get().loadRecurringRules(), get().reloadTasks()]);
            toast.success('Series updated');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not update the series'));
        }
    },

    stopRecurringSeries: async (id) => {
        try {
            await stopRecurring(id);
            await Promise.all([get().loadRecurringRules(), get().reloadTasks()]);
            toast.success('Stopped repeating');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not stop the series'));
        }
    },

    moveTask: async (taskId, newDate) => {
        await get().updateTask(taskId, { date: newDate });
    },

    toggleDailyTask: async (id) => {
        const previousDailyTasks = get().dailyTasks;
        const target = previousDailyTasks.find((task) => task.id === id);
        if (!target) return;

        const nextCompleted = !target.completed;
        set((state) => ({
            dailyTasks: state.dailyTasks.map(task =>
                task.id === id ? { ...task, completed: nextCompleted } : task
            )
        }));

        // Also reflect the toggle on the board if the same task is shown there
        // (dailyTasks ids are the underlying Task's server id - see
        // mapToClientDailyTask in plannerMapping.ts).
        set((state) => ({
            tasks: state.tasks.map((task) =>
                task.id === id ? { ...task, completed: nextCompleted } : task
            ),
        }));

        if (isTempId(id)) return;

        try {
            await updateTaskRequest(id, mapCompletedToStatusPayload(nextCompleted));
        } catch (error) {
            set({ dailyTasks: previousDailyTasks });
            toast.error(getErrorMessage(error, 'Could not update task'));
        }
    },

    addDailyTask: async (task) => {
        const tempId = `temp-daily-${Date.now()}`;
        const optimisticTask: DailyTask = { ...task, id: tempId };
        set((state) => ({ dailyTasks: [...state.dailyTasks, optimisticTask] }));

        const { channel, payload } = mapToCreateDailyServerTaskPayload(task);
        try {
            const createdTask = await createTask(channel, payload);
            const currentIds = get()
                .dailyTasks
                .map((t) => t.id)
                .filter((taskId) => taskId !== tempId && !isTempId(taskId));
            const plan = await updateDailyPlanner(todayDateKey(), {
                tasks: [...currentIds, createdTask._id],
            });
            set({ dailyTasks: plan.tasks.map(mapToClientDailyTask) });
        } catch (error) {
            set((state) => ({ dailyTasks: state.dailyTasks.filter((t) => t.id !== tempId) }));
            toast.error(getErrorMessage(error, 'Could not add daily task'));
        }
    },

    loadWeeklyPlan: async () => {
        let data: WeeklyCurrentResponse;
        try {
            data = await getCurrentWeek();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not load your weekly plan'));
            return;
        }

        set({
            weeklyWeekKey: data.weekStart,
            weeklyGoals: data.plan.goals,
            weeklyPriorities: data.plan.priorities,
            weeklyReviewNotes: data.plan.reviewNotes,
            weeklyReflection: data.plan.reflection ?? { wentWell: '', didnt: '', change: '' },
            weeklyPlanningCompletedAt: data.plan.planningCompletedAt,
            weeklyReviewCompletedAt: data.plan.reviewCompletedAt,
            weeklyStats: data.stats,
            weeklyPreviousStats: data.previousStats,
            weeklyLoaded: true,
        });

        const serverIsEmpty = data.plan.goals.length === 0 && data.plan.priorities.length === 0;
        await migrateLegacyWeeklyRituals(serverIsEmpty, (payload) => get().saveWeeklyPlan(payload));
    },

    saveWeeklyPlan: async (payload) => {
        const { weeklyWeekKey, weeklyGoals, weeklyPriorities, weeklyReviewNotes } = get();
        if (!weeklyWeekKey) {
            toast('Your weekly plan is still loading, try again in a moment');
            return false;
        }

        const previous = { weeklyGoals, weeklyPriorities, weeklyReviewNotes };
        set({
            weeklyGoals: payload.goals ?? weeklyGoals,
            weeklyPriorities: payload.priorities ?? weeklyPriorities,
            weeklyReviewNotes: payload.reviewNotes ?? weeklyReviewNotes,
        });

        try {
            const saved = await updateWeeklyPlan(weeklyWeekKey, payload);
            set({
                weeklyReflection: saved.reflection ?? get().weeklyReflection,
                weeklyPlanningCompletedAt: saved.planningCompletedAt,
                weeklyReviewCompletedAt: saved.reviewCompletedAt,
            });
            return true;
        } catch (error) {
            set(previous);
            toast.error(getErrorMessage(error, 'Could not save your weekly plan'));
            return false;
        }
    },

    setWeeklyReviewNotes: (notes) => set({ weeklyReviewNotes: notes }),

    addWeeklyGoal: (title) => {
        const weeklyGoals = [
            ...get().weeklyGoals,
            { id: `${Date.now()}`, title: title.trim(), progress: 0, target: 7 },
        ];
        void get().saveWeeklyPlan({ goals: weeklyGoals });
    },

    removeWeeklyGoal: (id) => {
        const weeklyGoals = get().weeklyGoals.filter((goal) => goal.id !== id);
        void get().saveWeeklyPlan({ goals: weeklyGoals });
    },

    updateWeeklyGoalProgress: (id, increment) => {
        const weeklyGoals = get().weeklyGoals.map((goal) =>
            goal.id === id
                ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + increment)) }
                : goal
        );
        void get().saveWeeklyPlan({ goals: weeklyGoals });
    },

    addWeeklyPriority: (text) => {
        const weeklyPriorities = [...get().weeklyPriorities, text.trim()];
        void get().saveWeeklyPlan({ priorities: weeklyPriorities });
    },

    removeWeeklyPriority: (index) => {
        const weeklyPriorities = get().weeklyPriorities.filter((_, i) => i !== index);
        void get().saveWeeklyPlan({ priorities: weeklyPriorities });
    },

    getFilteredTasks: () => {
        const { tasks, filterTags, filterStatus } = get();
        return tasks.filter(task => {
            const tagMatch = filterTags.includes('all') || filterTags.includes(task.tag as FilterTag);
            const statusMatch = filterStatus === 'all' ||
                (filterStatus === 'completed' && task.completed) ||
                (filterStatus === 'pending' && !task.completed);
            return tagMatch && statusMatch;
        });
    },
}));
