/**
 * Mapping layer between the server's UniversalTask[] (server/src/modules/
 * integration/adapters/types.ts) and the four provider specific view types
 * the client's existing, finished card components already render:
 * GitHubIssue, GitHubPR, GmailMessage, NotionPage (client/types/index.ts).
 *
 * The server normalises every provider (GitHub, Gmail, Notion) into one
 * wide, mostly optional UniversalTask shape so GET /integrations/items can
 * return a single flat array plus a per provider `errors` sidecar. This
 * module widens that flat array back out into the four provider specific
 * arrays that GitHubIssueCard, GitHubPRCard, GmailCard and NotionCard
 * already expect, so none of those components need to change.
 *
 * ─── Fields with no server counterpart (synthesised here) ────────────────
 * - GitHubIssue.id / GitHubPR.id: the client types these as `number` (used
 *   as a React key and for display) but the server only ever sends a
 *   string `externalId`. We Number() it, and when that is NaN (for example
 *   a base64 GraphQL node id) we fall back to a synthetic negative id
 *   instead, so keys stay unique and never NaN. See fallbackId() below for
 *   why it is negative and scoped per output array.
 * - GitHubIssue.externalId / GitHubPR.externalId / GmailMessage.externalId /
 *   NotionPage.externalId: the server's original UniversalTask.externalId
 *   string, copied through untouched. This is what provenance (the id sent
 *   back to the server when a card is dragged onto the board) must read,
 *   never the numeric `id` above, since that id can be a synthesised
 *   fallback with no relation to the real item.
 * - GmailMessage.link: UniversalTask.link, copied through untouched. The
 *   other three view types already carry this as `url`.
 * - Every other required client field (body, repository, author, labels,
 *   assignees, snippet, from, fromEmail, workspace, unread, etc.) falls
 *   back to an empty string, an empty array, or false when the server left
 *   it undefined, since UniversalTask marks almost everything but the core
 *   fields optional while the client view types do not allow undefined
 *   there.
 */

import type { GitHubIssue, GitHubPR, GmailMessage, NotionPage } from "@/types";
import type { UniversalTask } from "./integrations";

export interface MappedIntegrationItems {
  githubIssues: GitHubIssue[];
  githubPRs: GitHubPR[];
  gmailMessages: GmailMessage[];
  notionPages: NotionPage[];
}

/** Number(externalId), falling back to a synthetic id when it is not numeric. */
function toNumericId(externalId: string, fallbackId: number): number {
  const parsed = Number(externalId);
  return Number.isNaN(parsed) ? fallbackId : parsed;
}

/**
 * Builds the fallback id used when an item's externalId does not parse as a
 * number. It is scoped to the length of the specific output array the item
 * is about to be pushed into (rather than a shared index across the whole
 * mixed input array), and negative. No real provider issues negative ids,
 * so this cannot collide with a real id: not merely unlikely, structurally
 * impossible. The negative sign also makes the synthetic origin obvious at
 * a glance in a debugger.
 */
function fallbackId(outputArrayLength: number): number {
  return -(outputArrayLength + 1);
}

/**
 * Returns `value` unchanged when it parses to a valid date, otherwise a
 * fresh `new Date().toISOString()`. The server's adapters are expected to
 * always emit a valid ISO string, but the client must not trust the wire:
 * an empty or malformed date reaching `new Date(...)` inside the card
 * components' date-fns calls throws a RangeError and blanks the whole
 * dashboard route, so every date field mapped below goes through this.
 */
function toValidDateString(value: string | undefined): string {
  if (value && !Number.isNaN(new Date(value).getTime())) {
    return value;
  }
  return new Date().toISOString();
}

function toIssueState(status: string): GitHubIssue["state"] {
  return status === "closed" ? "closed" : "open";
}

function toPrState(status: string): GitHubPR["state"] {
  return status === "closed" || status === "merged" ? status : "open";
}

function toGitHubIssue(task: UniversalTask, outputArrayLength: number): GitHubIssue {
  return {
    id: toNumericId(task.externalId, fallbackId(outputArrayLength)),
    number: task.number ?? 0,
    title: task.title || "",
    body: task.body || "",
    state: toIssueState(task.status),
    repository: task.repository || "",
    author: task.author || "",
    authorAvatar: task.authorAvatar,
    createdAt: toValidDateString(task.createdAt),
    labels: task.labels || [],
    assignees: task.assignees || [],
    url: task.link || "",
    externalId: task.externalId,
  };
}

function toGitHubPR(task: UniversalTask, outputArrayLength: number): GitHubPR {
  return {
    id: toNumericId(task.externalId, fallbackId(outputArrayLength)),
    number: task.number ?? 0,
    title: task.title || "",
    body: task.body || "",
    state: toPrState(task.status),
    repository: task.repository || "",
    author: task.author || "",
    authorAvatar: task.authorAvatar,
    createdAt: toValidDateString(task.createdAt),
    labels: task.labels || [],
    url: task.link || "",
    externalId: task.externalId,
  };
}

function toGmailMessage(task: UniversalTask): GmailMessage {
  return {
    id: task.externalId,
    threadId: task.threadId || task.externalId,
    subject: task.title || "",
    from: task.from || "",
    fromEmail: task.fromEmail || "",
    snippet: task.snippet || "",
    date: toValidDateString(task.createdAt),
    unread: task.unread ?? false,
    externalId: task.externalId,
    link: task.link || "",
  };
}

function toNotionPage(task: UniversalTask): NotionPage {
  return {
    id: task.externalId,
    title: task.title || "",
    icon: task.icon,
    workspace: task.workspace || "",
    lastEdited: toValidDateString(task.lastEdited || task.createdAt),
    url: task.link || "",
    externalId: task.externalId,
  };
}

/**
 * Partitions a flat UniversalTask[] by provider and type into the four
 * arrays the existing card components expect. Anything that does not match
 * one of the four known provider/type combinations is skipped rather than
 * crashing, since the server may add new provider or type values over time.
 */
export function mapIntegrationItems(items: UniversalTask[]): MappedIntegrationItems {
  const githubIssues: GitHubIssue[] = [];
  const githubPRs: GitHubPR[] = [];
  const gmailMessages: GmailMessage[] = [];
  const notionPages: NotionPage[] = [];

  items.forEach((task) => {
    if (task.provider === "github" && task.type === "issue") {
      githubIssues.push(toGitHubIssue(task, githubIssues.length));
    } else if (task.provider === "github" && task.type === "pr") {
      githubPRs.push(toGitHubPR(task, githubPRs.length));
    } else if (task.provider === "gmail" && task.type === "email") {
      gmailMessages.push(toGmailMessage(task));
    } else if (task.provider === "notion" && task.type === "page") {
      notionPages.push(toNotionPage(task));
    }
  });

  return { githubIssues, githubPRs, gmailMessages, notionPages };
}
