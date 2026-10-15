import { useEffect, useState } from "react";
import { getItemDetail, type IntegrationItemDetail } from "@/lib/api/integrations";
import { safeFormatDistanceToNow } from "@/lib/formatDate";
import { sourceOf, externalIdOf, type IntegrationItem } from "@/lib/integrationTasks";
import { IntegrationItemActions } from "./IntegrationItemActions";

/**
 * Bottom of the integration detail sheet: the item's full text loaded on demand (email body,
 * Notion page content, GitHub comments), and a sticky bar with the one click add buttons.
 */
export function IntegrationDetailExtras({ item }: { item: IntegrationItem }) {
  const [detail, setDetail] = useState<IntegrationItemDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const provider = sourceOf(item);
  const externalId = externalIdOf(item);
  const github =
    item.type === "github-issue" || item.type === "github-pr"
      ? { repo: item.data.repository, number: item.data.number }
      : undefined;
  const githubRepo = github?.repo;
  const githubNumber = github?.number;

  useEffect(() => {
    let cancelled = false;
    getItemDetail(
      provider,
      externalId,
      githubRepo && githubNumber ? { repo: githubRepo, number: githubNumber } : undefined
    )
      .then((value) => {
        if (!cancelled) setDetail(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, externalId, githubRepo, githubNumber]);

  // GitHub already shows the body from the list, so only its comments are new here.
  const showBody = provider !== "github";
  const heading = provider === "gmail" ? "Full message" : "Page content";

  return (
    <>
      <div className="space-y-4 px-6 pb-6">
        {!detail && !failed && <p className="text-sm text-muted-foreground">Loading the full text...</p>}
        {failed && <p className="text-sm text-muted-foreground">Couldn&apos;t load the full text. Open it in {provider === "github" ? "GitHub" : provider === "gmail" ? "Gmail" : "Notion"} instead.</p>}

        {detail && showBody && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">{heading}</h4>
            {detail.body ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{detail.body}</p>
            ) : (
              <p className="text-sm text-muted-foreground">This one is empty.</p>
            )}
            {detail.truncated && <p className="mt-2 text-xs text-muted-foreground">Shortened. Open the original for the rest.</p>}
          </div>
        )}

        {detail && provider === "github" && detail.comments.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Latest comments</h4>
            <div className="space-y-3">
              {detail.comments.map((comment, index) => (
                <div key={`${comment.createdAt}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {comment.author} · {safeFormatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-6 py-3 backdrop-blur-sm">
        <IntegrationItemActions item={item} />
      </div>
    </>
  );
}
