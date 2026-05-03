import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Habit, HabitFormData } from "@/types";

interface Props {
  habit?: Habit | null; // null = create mode, Habit = edit mode
  onSubmit: (data: HabitFormData) => Promise<void>;
  onClose: () => void;
}

export default function HabitModal({ habit, onSubmit, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormData>({
    defaultValues: {
      name: "",
      description: "",
      frequency: "daily",
      streakThreshold: 50,
    },
  });

  // Якщо відкриваємо в режимі редагування — заповнюємо форму
  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description ?? "",
        frequency: habit.frequency,
        streakThreshold: habit.streakThreshold,
      });
    } else {
      reset({
        name: "",
        description: "",
        frequency: "daily",
        streakThreshold: 50,
      });
    }
  }, [habit, reset]);

  const handleFormSubmit = async (data: HabitFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {habit ? "Edit habit" : "New habit"}
        </h2>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g. Morning run"
              {...register("name", {
                required: "Name is required",
                maxLength: { value: 100, message: "Max 100 characters" },
              })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Optional details…"
              {...register("description")}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Frequency
            </label>
            <select
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              {...register("frequency")}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Streak threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Streak threshold
              <span className="font-normal text-gray-400 ml-1">
                (min % to count toward streak)
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              {...register("streakThreshold", {
                required: true,
                min: { value: 1, message: "Min 1" },
                max: { value: 100, message: "Max 100" },
                valueAsNumber: true,
              })}
            />
            {errors.streakThreshold && (
              <p className="text-red-500 text-xs mt-1">
                {errors.streakThreshold.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {isSubmitting
                ? "Saving…"
                : habit
                  ? "Save changes"
                  : "Create habit"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
