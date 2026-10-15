import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/dashboard/rituals/RitualParts";
import { useStore } from "@/store/useStore";
import {
  getIntegrationOptions,
  type ConnectedIntegration,
  type IntegrationOptions,
  type IntegrationProvider,
  type IntegrationSettings,
} from "@/lib/api/integrations";

const GMAIL_PRESETS: { value: IntegrationSettings["gmailPreset"]; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "starred", label: "Starred" },
  { value: "unread", label: "Unread" },
  { value: "important", label: "Important" },
  { value: "label", label: "A label" },
];

/**
 * Per provider settings, shown inside the panel: which items to pull in (Gmail view, Notion
 * databases, GitHub review requests) and the connection itself.
 */
export function IntegrationConfigure({
  provider,
  entry,
  onDisconnect,
}: {
  provider: IntegrationProvider;
  entry: ConnectedIntegration;
  onDisconnect: () => void;
}) {
  const saveIntegrationSettings = useStore((state) => state.saveIntegrationSettings);
  const settings = entry.settings;
  const [options, setOptions] = useState<IntegrationOptions | null>(null);

  useEffect(() => {
    if (provider === "github") return;
    let cancelled = false;
    getIntegrationOptions(provider)
      .then((value) => {
        if (!cancelled) setOptions(value);
      })
      .catch(() => {
        if (!cancelled) setOptions({});
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const save = (next: Partial<IntegrationSettings>) => void saveIntegrationSettings(provider, next);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      {provider === "github" && (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-foreground">Review requests</p>
            <p className="text-xs text-muted-foreground">Show pull requests waiting for your review.</p>
          </div>
          <Switch
            checked={settings?.githubIncludeReviews ?? true}
            onCheckedChange={(checked) => save({ githubIncludeReviews: checked })}
            aria-label="Include review requests"
          />
        </div>
      )}

      {provider === "gmail" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Show</p>
          <div className="flex flex-wrap gap-1">
            {GMAIL_PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                active={(settings?.gmailPreset ?? "inbox") === preset.value}
                onClick={() => {
                  if (preset.value !== "label") save({ gmailPreset: preset.value });
                  else if (settings?.gmailLabelId) save({ gmailPreset: "label", gmailLabelId: settings.gmailLabelId });
                  else setOptions((current) => current ?? {});
                }}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
          <select
            value={settings?.gmailPreset === "label" ? settings.gmailLabelId ?? "" : ""}
            onChange={(e) => e.target.value && save({ gmailPreset: "label", gmailLabelId: e.target.value })}
            className="w-full rounded-lg border border-foreground/10 bg-card px-2 py-1.5 text-xs"
            aria-label="Gmail label"
          >
            <option value="">{options ? "Pick a label..." : "Loading labels..."}</option>
            {options?.labels?.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {provider === "notion" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Show</p>
          <div className="flex gap-1">
            <Chip active={(settings?.notionMode ?? "pages") === "pages"} onClick={() => save({ notionMode: "pages" })}>
              Recent pages
            </Chip>
            <Chip active={settings?.notionMode === "databases"} onClick={() => save({ notionMode: "databases" })}>
              Databases
            </Chip>
          </div>
          {settings?.notionMode === "databases" && (
            <div className="space-y-1">
              {!options && <p className="text-xs text-muted-foreground">Loading databases...</p>}
              {options?.databases?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No databases shared with Zenith yet. Share one with the Zenith integration in Notion.
                </p>
              )}
              {options?.databases?.map((db) => {
                const selected = settings.notionDatabaseIds.includes(db.id);
                return (
                  <label key={db.id} className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        save({
                          notionMode: "databases",
                          notionDatabaseIds: selected
                            ? settings.notionDatabaseIds.filter((id) => id !== db.id)
                            : [...settings.notionDatabaseIds, db.id],
                        })
                      }
                    />
                    {db.title}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="truncate text-xs text-muted-foreground">Connected as {entry.profile.username}</span>
        <Button variant="ghost" size="sm" onClick={onDisconnect} className="h-6 shrink-0 px-2 text-xs">
          Disconnect
        </Button>
      </div>
    </div>
  );
}
