// Turns the repeat presets shown in the UI into RRULE strings, and back.
// The UI only offers presets, so raw RRULE text is never shown to the user.

export type RepeatPreset = "none" | "daily" | "weekdays" | "weekly" | "monthly";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** weekDays uses 0 = Sunday ... 6 = Saturday. date is the task's "yyyy-MM-dd". */
export function buildRule(preset: RepeatPreset, weekDays: number[], date: string): string | null {
  switch (preset) {
    case "none":
      return null;
    case "daily":
      return "FREQ=DAILY";
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    case "weekly": {
      const days = weekDays.length > 0 ? weekDays : [new Date(`${date}T00:00:00`).getDay()];
      return `FREQ=WEEKLY;BYDAY=${[...days].sort().map((d) => DAY_CODES[d]).join(",")}`;
    }
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${Number(date.slice(8, 10))}`;
  }
}

/** Reverses buildRule so the picker can show an existing rule. */
export function parseRule(rrule: string): { preset: RepeatPreset; weekDays: number[] } {
  if (rrule === "FREQ=DAILY") return { preset: "daily", weekDays: [] };
  if (rrule === "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR") return { preset: "weekdays", weekDays: [] };
  const weekly = /^FREQ=WEEKLY;BYDAY=([A-Z,]+)$/.exec(rrule);
  if (weekly) {
    const weekDays = weekly[1]
      .split(",")
      .map((code) => DAY_CODES.indexOf(code as (typeof DAY_CODES)[number]));
    return { preset: "weekly", weekDays: weekDays.filter((d) => d >= 0) };
  }
  if (rrule.startsWith("FREQ=MONTHLY")) return { preset: "monthly", weekDays: [] };
  return { preset: "none", weekDays: [] };
}

export function describeRule(rrule: string): string {
  const { preset, weekDays } = parseRule(rrule);
  if (preset === "daily") return "Every day";
  if (preset === "weekdays") return "Every weekday";
  if (preset === "weekly") return `Every week on ${weekDays.map((d) => DAY_LABELS[d]).join(", ")}`;
  if (preset === "monthly") {
    const day = /BYMONTHDAY=(\d+)/.exec(rrule)?.[1];
    return day ? `Every month on day ${day}` : "Every month";
  }
  return "Repeats";
}
