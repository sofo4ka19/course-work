import { useState } from "react";
import type { Habit } from "@/types";

interface HabitCardProps {
  habit: Habit;
  onEdit: (h: Habit) => void;
  onDelete: (id: number) => void;
  onLog: (habitId: number) => void;
}

export function HabitCard({ habit, onEdit, onDelete, onLog }: HabitCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = habit.todayPct !== null;
  const pct = habit.todayPct ?? 0;
  const streakHot = habit.currentStreak >= 7;
  const streakWarm = habit.currentStreak >= 3;

  const borderCls = done
    ? "border-accent-200"
    : habit.currentStreak === 0 &&
        habit.weekAvgPct !== null &&
        habit.weekAvgPct < 30
      ? "border-danger-200"
      : "border-card-border hover:border-accent-200";

  const fillColor =
    pct >= 75 ? "bg-accent-500" : pct >= 40 ? "bg-warn-500" : "bg-danger-500";

  const freqLabel =
    habit.frequency === "custom" && habit.customFrequency
      ? habit.customFrequency
      : habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1);

  return (
    <div
      className={`bg-card rounded-xl border transition-colors flex flex-col ${borderCls}`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {habit.name}
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{freqLabel}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(habit)}
              title="Edit"
              className="text-gray-400 hover:text-accent-400 hover:bg-accent-50 p-1.5 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="text-gray-400 hover:text-danger-500 hover:bg-danger-50 p-1.5 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* big number */}
        <div className="mb-1">
          <span
            className={`text-3xl font-black leading-none ${
              done ? "text-accent-500" : "text-gray-200"
            }`}
          >
            {done ? pct : "—"}
          </span>
          {done && <span className="text-sm font-bold text-accent-400">%</span>}
        </div>
        <p
          className={`text-[10px] mb-3 ${done ? "text-accent-400" : "text-gray-300"}`}
        >
          {done ? "today's completion" : "not logged today"}
        </p>

        {/* bar */}
        <div className="h-1.5 bg-accent-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${fillColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* footer */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
              streakHot
                ? "bg-warn-100 text-warn-700"
                : streakWarm
                  ? "bg-accent-100 text-accent-400"
                  : "bg-gray-800 text-gray-400"
            }`}
          >
            {streakHot ? "🔥 " : ""}
            {habit.currentStreak}d
            {habit.maxStreak > habit.currentStreak && habit.maxStreak > 0
              ? ` / ${habit.maxStreak}`
              : ""}
          </span>

          <button
            onClick={() => onLog(habit.id)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
              done
                ? "bg-accent-100 text-accent-700 hover:bg-accent-500 hover:text-white"
                : "bg-gradient-to-r from-accent-500 to-accent-400 text-white hover:from-accent-600 hover:to-accent-500"
            }`}
          >
            {done ? "✓ Logged" : "Log today"}
          </button>
        </div>
      </div>

      {/* delete confirm */}
      {confirmDelete && (
        <div className="px-4 pb-4 border-t border-card-border pt-3">
          <p className="text-xs text-gray-400 mb-2">
            Delete <strong>{habit.name}</strong>? All history will be lost.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(habit.id);
                setConfirmDelete(false);
              }}
              className="px-3 py-1.5 bg-danger-500 hover:bg-danger-700 text-white text-xs font-bold rounded-lg"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-surface hover:bg-gray-800 text-gray-400 text-xs font-bold rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
