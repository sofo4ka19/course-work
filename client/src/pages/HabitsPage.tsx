import { useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { habitsApi } from "@/api/habitsApi";
import type { Habit } from "@/types";
import { HabitCard } from "@/components/HabitCard";
import { HabitModal } from "@/components/HabitModal";
import { CompletionSlider } from "@/components/CompletionSlider";
import Spinner from "@/components/Spinner";

export default function HabitsPage() {
  const {
    habits,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    logCompletion,
  } = useHabits();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [logging, setLogging] = useState<Habit | null>(null);
  const [completionsMap, setCompletionsMap] = useState<
    Record<number, Record<string, number>>
  >({});

  const openLog = async (id: number) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    // Завантажуємо completions для date picker
    const res = await habitsApi.getCompletions(id);
    const map: Record<string, number> = {};
    for (const c of res.data.data) {
      map[c.completionDate.split("T")[0]] = c.completionPct;
    }
    setCompletionsMap((prev) => ({ ...prev, [id]: map }));
    setLogging(habit);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-white">My habits</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {habits.length} habits tracked
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-400 text-white text-sm font-bold rounded-xl"
        >
          + New habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <p className="font-bold text-gray-400">No habits yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first habit to get started
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-400 text-white text-sm font-bold rounded-xl"
          >
            + Create habit
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={(h) => {
                setEditing(h);
                setModalOpen(true);
              }}
              onDelete={deleteHabit}
              onLog={openLog}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <HabitModal
          habit={editing}
          onSubmit={(d) =>
            editing ? updateHabit(editing.id, d) : createHabit(d)
          }
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {logging && (
        <CompletionSlider
          habit={logging}
          onSubmit={(pct, date) => logCompletion(logging.id, pct, date)}
          onClose={() => setLogging(null)}
          existingCompletions={completionsMap[logging.id] ?? {}}
        />
      )}
    </div>
  );
}
