import { useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import type { Habit, HabitFormData } from "@/types";
import HabitCard from "@/components/HabitCard";
import HabitModal from "@/components/HabitModal";
import CompletionSlider from "@/components/CompletionSlider";

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
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [loggingHabit, setLoggingHabit] = useState<Habit | null>(null);

  const handleSubmit = async (data: HabitFormData) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, data);
    } else {
      await createHabit(data);
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingHabit(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Habits</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {habits.length} habits tracked
          </p>
        </div>
        <button
          onClick={() => {
            setEditingHabit(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New habit
        </button>
      </div>

      {/* ── Empty state ───────────────────────────────── */}
      {habits.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">✓</div>
          <p className="font-medium text-gray-500">No habits yet</p>
          <p className="text-sm mt-1">Create your first habit to get started</p>
        </div>
      )}

      {/* ── Habit grid ────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onEdit={handleEdit}
            onDelete={deleteHabit}
            onLog={(id) => setLoggingHabit(habits.find((h) => h.id === id)!)}
          />
        ))}
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      {modalOpen && (
        <HabitModal
          habit={editingHabit}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
        />
      )}

      {loggingHabit && (
        <CompletionSlider
          habit={loggingHabit}
          onSubmit={(pct) => logCompletion(loggingHabit.id, pct)}
          onClose={() => setLoggingHabit(null)}
        />
      )}
    </div>
  );
}
