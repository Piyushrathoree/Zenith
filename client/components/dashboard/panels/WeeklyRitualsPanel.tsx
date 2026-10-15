import { WeeklyPlanningFlow } from "@/components/dashboard/rituals/WeeklyPlanningFlow";
import { WeeklyReviewFlow } from "@/components/dashboard/rituals/WeeklyReviewFlow";

interface WeeklyRitualsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: "planning" | "review";
}

// The weekly rituals are guided flows now (Phase 8). The flows only mount while open, so each
// opening starts fresh at step 1 and loads current data.
export function WeeklyRitualsPanel({ isOpen, onClose, type }: WeeklyRitualsPanelProps) {
  if (!isOpen) return null;
  return type === "planning" ? <WeeklyPlanningFlow onClose={onClose} /> : <WeeklyReviewFlow onClose={onClose} />;
}
