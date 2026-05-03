import { useState } from "react";
import type { Habit } from "@/types";
import { localDateStr, lastNDays } from "@/utils/date";

interface CompletionSliderProps {
  habit: Habit;
  onSubmit: (pct: number, date?: string) => Promise<void>;
  onClose: () => void;
  existingCompletions?: Record<string, number>; // "YYYY-MM-DD" → pct
}

export function CompletionSlider({
  habit,
  onSubmit,
  onClose,
  existingCompletions = {},
}: CompletionSliderProps) {
  const [pct, setPct] = useState(habit.todayPct ?? 100);
  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const aboveThreshold = pct >= habit.streakThreshold;
  const isToday = selectedDate === localDateStr();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(pct, isToday ? undefined : selectedDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDaySelect = (day: string) => {
    setSelectedDate(day);
    // Якщо вже є запис за цей день — підставляємо його значення
    if (existingCompletions[day] !== undefined) {
      setPct(existingCompletions[day]);
    }
    setShowCalendar(false);
  };

  const last7 = lastNDays(7);

  const numColor =
    pct >= habit.streakThreshold
      ? "text-accent-500"
      : pct >= habit.streakThreshold / 2
        ? "text-warn-500"
        : "text-danger-500";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(15,15,26,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        {/* header */}
        <div className="bg-sidebar px-5 py-4">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
            Log completion
          </p>
          <p className="text-sm font-extrabold text-white mt-0.5 truncate">
            {habit.name}
          </p>
          {!isToday && (
            <p className="text-[10px] text-accent-300 mt-0.5">
              Logging for {selectedDate}
            </p>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* big number */}
          <div className="text-center py-2">
            <span className={`text-7xl font-black tabular-nums ${numColor}`}>
              {pct}
            </span>
            <span className={`text-3xl font-bold ${numColor}`}>%</span>
          </div>

          {/* slider */}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full accent-accent-500"
          />
          <div className="flex justify-between text-[10px] text-gray-300 -mt-2">
            <span>0%</span>
            <span className="text-gray-400">
              streak ≥ {habit.streakThreshold}%
            </span>
            <span>100%</span>
          </div>

          {/* streak badge */}
          <div
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold ${
              aboveThreshold
                ? "bg-success-50 text-success-500 border border-success-200"
                : "bg-surface text-gray-400 border border-card-border"
            }`}
          >
            {aboveThreshold
              ? "✓ Counts toward streak"
              : "✗ Below streak threshold"}
          </div>

          {/* quick presets */}
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 25, 50, 75, 100].map((v) => (
              <button
                key={v}
                onClick={() => setPct(v)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pct === v
                    ? "bg-accent-500 text-white"
                    : "bg-accent-50 text-accent-400 hover:bg-accent-100"
                }`}
              >
                {v}%
              </button>
            ))}
          </div>

          {/* not today picker */}
          <div className="border border-card-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-surface text-xs hover:bg-accent-50 transition-colors"
            >
              <span className="text-gray-500 font-medium">
                {isToday ? "Not today?" : `Selected: ${selectedDate}`}
              </span>
              <span className="text-accent-500 font-bold">
                {showCalendar ? "▴" : "▾"} pick a day
              </span>
            </button>

            {showCalendar && (
              <div className="px-3 py-3 border-t border-card-border">
                <div className="grid grid-cols-7 gap-1.5">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div
                      key={i}
                      className="text-center text-[9px] text-gray-400 font-medium py-1"
                    >
                      {d}
                    </div>
                  ))}
                  {last7.map((day) => {
                    const isSelected = day === selectedDate;
                    const hasData = existingCompletions[day] !== undefined;
                    const isTodayDay = day === localDateStr();
                    return (
                      <button
                        key={day}
                        onClick={() => handleDaySelect(day)}
                        className={`relative py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          isSelected
                            ? "bg-gradient-to-br from-accent-500 to-accent-400 text-white"
                            : isTodayDay
                              ? "bg-accent-100 text-accent-300"
                              : "bg-surface text-gray-400 hover:bg-accent-50"
                        }`}
                      >
                        {new Date(day + "T12:00:00").getDate()}
                        {hasData && (
                          <span
                            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                              isSelected ? "bg-white" : "bg-accent-500"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-gray-400 text-center mt-2">
                  Dot = already has a record
                </p>
              </div>
            )}
          </div>

          {/* actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-surface hover:bg-gray-800 text-gray-400 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
