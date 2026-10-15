import { cn } from "@/lib/utils";
import type { RepeatPreset } from "@/lib/recurrence";

const PRESETS: { value: RepeatPreset; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// Index matches the weekDays values: 0 = Sunday ... 6 = Saturday.
const WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface RepeatPickerProps {
  preset: RepeatPreset;
  weekDays: number[];
  /** Day of month of the task, used for the monthly hint. */
  monthDay?: number;
  onChange: (next: { preset: RepeatPreset; weekDays: number[] }) => void;
}

export function RepeatPicker({ preset, weekDays, monthDay, onChange }: RepeatPickerProps) {
  const toggleDay = (day: number) => {
    const next = weekDays.includes(day)
      ? weekDays.filter((d) => d !== day)
      : [...weekDays, day];
    onChange({ preset, weekDays: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange({ preset: item.value, weekDays })}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs",
              preset === item.value
                ? "border-brand/40 bg-brand-soft text-brand"
                : "border-foreground/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === "weekly" && (
        <div className="flex gap-1.5">
          {WEEK_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              aria-pressed={weekDays.includes(day)}
              onClick={() => toggleDay(day)}
              className={cn(
                "h-7 w-7 rounded-full border text-xs",
                weekDays.includes(day)
                  ? "border-brand/40 bg-brand-soft text-brand"
                  : "border-foreground/10 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {preset === "monthly" && monthDay !== undefined && monthDay > 28 && (
        <p className="text-xs text-muted-foreground">
          Months without day {monthDay} are skipped.
        </p>
      )}
    </div>
  );
}
