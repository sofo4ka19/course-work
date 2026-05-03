import { useState } from "react";
import type { Habit } from "@/types";

interface Props {
  habit: Habit;
  onSubmit: (pct: number) => Promise<void>;
  onClose: () => void;
}

export default function CompletionSlider({ habit, onSubmit, onClose }: Props) {
  const [pct, setPct] = useState(habit.todayPct ?? 100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(pct);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Колір повзунка і числа залежить від значення
  const color =
    pct >= habit.streakThreshold
      ? "text-green-600"
      : pct >= habit.streakThreshold / 2
        ? "text-yellow-500"
        : "text-red-500";

  const trackColor =
    pct >= habit.streakThreshold
      ? "accent-green-600"
      : pct >= habit.streakThreshold / 2
        ? "accent-yellow-500"
        : "accent-red-500";

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Log completion
        </h2>
        <p className="text-sm text-gray-400 mb-6 truncate">{habit.name}</p>

        {/* Big percentage display */}
        <div className="text-center mb-6">
          <span className={`text-6xl font-bold tabular-nums ${color}`}>
            {pct}
          </span>
          <span className={`text-2xl font-medium ${color}`}>%</span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className={`w-full h-2 rounded-full outline-none cursor-pointer ${trackColor}`}
        />

        {/* Threshold hint */}
        <div className="flex justify-between text-xs text-gray-300 mt-1 mb-6">
          <span>0%</span>
          <span className="text-gray-400">
            streak threshold: {habit.streakThreshold}%
          </span>
          <span>100%</span>
        </div>

        {/* Streak indicator */}
        <div
          className={`text-center text-sm mb-6 font-medium ${
            pct >= habit.streakThreshold ? "text-green-600" : "text-gray-400"
          }`}
        >
          {pct >= habit.streakThreshold
            ? "✓ Counts toward streak"
            : "✗ Below streak threshold"}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
