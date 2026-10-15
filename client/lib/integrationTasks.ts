import type { GitHubIssue, GitHubPR, GmailMessage, NotionPage, Task } from "@/types";

/** One integration item, in the same shape the cards and the detail modal already use. */
export type IntegrationItem =
  | { type: "github-issue"; data: GitHubIssue }
  | { type: "github-pr"; data: GitHubPR }
  | { type: "gmail"; data: GmailMessage }
  | { type: "notion"; data: NotionPage };

export type TaskSource = NonNullable<Task["source"]>;

export function sourceOf(item: IntegrationItem): TaskSource {
  return item.type === "github-issue" || item.type === "github-pr" ? "github" : item.type;
}

/** The provider's own id. Provenance must use this, never the synthesised numeric card id. */
export function externalIdOf(item: IntegrationItem): string {
  switch (item.type) {
    case "github-issue":
    case "github-pr":
      return item.data.externalId || String(item.data.id);
    case "gmail":
    case "notion":
      return item.data.externalId || item.data.id;
  }
}

/** Key used to tell whether an item is already planned: "<source>:<externalId>". */
export function itemKey(item: IntegrationItem): string {
  return `${sourceOf(item)}:${externalIdOf(item)}`;
}

export function taskKey(task: Pick<Task, "source" | "externalId">): string | null {
  return task.source && task.externalId ? `${task.source}:${task.externalId}` : null;
}

export function itemTitle(item: IntegrationItem): string {
  return item.type === "gmail" ? item.data.subject : item.data.title;
}

/**
 * The task created when an item is added to the plan. `date` is "yyyy-MM-dd", or "" for the
 * backlog. Default durations: issue 1h, PR review 30m, email reply 15m, Notion page 30m.
 */
export function taskInputFromItem(item: IntegrationItem, date: string): Omit<Task, "id"> {
  const base = { tag: "work" as const, date, completed: false, inBacklog: date === "" };
  switch (item.type) {
    case "github-issue":
      return {
        ...base,
        title: item.data.title,
        duration: "1:00",
        source: "github",
        sourceData: item.data,
        externalId: externalIdOf(item),
        link: item.data.url,
      };
    case "github-pr":
      return {
        ...base,
        title: item.data.title,
        duration: "0:30",
        source: "github",
        externalId: externalIdOf(item),
        link: item.data.url,
      };
    case "gmail":
      return {
        ...base,
        title: `Reply: ${item.data.subject}`,
        duration: "0:15",
        source: "gmail",
        externalId: externalIdOf(item),
        // Prefer the server's direct link; rebuild one from the thread only when it is missing.
        link: item.data.link || `https://mail.google.com/mail/u/0/#all/${item.data.threadId}`,
      };
    case "notion":
      return {
        ...base,
        title: item.data.title,
        duration: "0:30",
        source: "notion",
        externalId: externalIdOf(item),
        link: item.data.url,
      };
  }
}

/** Maps a drag payload from the cards ({ type, issue | pr | message | page }) to an item. */
export function itemFromDragData(data: Record<string, unknown> | undefined): IntegrationItem | null {
  if (!data) return null;
  switch (data.type) {
    case "github-issue":
      return { type: "github-issue", data: data.issue as GitHubIssue };
    case "github-pr":
      return { type: "github-pr", data: data.pr as GitHubPR };
    case "gmail":
      return { type: "gmail", data: data.message as GmailMessage };
    case "notion":
      return { type: "notion", data: data.page as NotionPage };
    default:
      return null;
  }
}
