import { useState } from "react";
import type { Habit } from "@/types";

interface Props {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onDelete: (id: number) => void;
  onLog: (habitId: number) => void;
}

export default function HabitCard({ habit, onEdit, onDelete, onLog }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const streakColor =
    habit.currentStreak >= 7
      ? "text-green-600"
      : habit.currentStreak >= 3
        ? "text-yellow-600"
        : "text-gray-400";

  const pctColor =
    (habit.weekAvgPct ?? 0) >= 75
      ? "bg-green-500"
      : (habit.weekAvgPct ?? 0) >= 40
        ? "bg-yellow-400"
        : "bg-red-400";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{habit.name}</h3>
          {habit.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {habit.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(habit)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-xs"
          >
            edit
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
          >
            del
          </button>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-4">
        {/* Streak */}
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-semibold ${streakColor}`}>
            {habit.currentStreak}
          </span>
          <span className="text-xs text-gray-400">day streak</span>
        </div>

        {/* Week avg bar */}
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>7-day avg</span>
            <span>{habit.weekAvgPct ?? 0}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pctColor}`}
              style={{ width: `${habit.weekAvgPct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Today status + Log button ───────────────────── */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {habit.todayPct !== null ? (
            <span className="text-green-600 font-medium">
              Today: {habit.todayPct}%
            </span>
          ) : (
            <span className="text-gray-400">Not logged today</span>
          )}
        </div>

        <button
          onClick={() => onLog(habit.id)}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {habit.todayPct !== null ? "Update" : "Log"}
        </button>
      </div>

      {/* ── Delete confirm ──────────────────────────────── */}
      {showConfirm && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-3">
            Delete <strong>{habit.name}</strong>? All history will be lost.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(habit.id);
                setShowConfirm(false);
              }}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg"
            >
              Delete
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
