import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Habit, HabitFormData } from "@/types";

interface HabitModalProps {
  habit?: Habit | null;
  onSubmit: (data: HabitFormData) => Promise<void>;
  onClose: () => void;
}

export function HabitModal({ habit, onSubmit, onClose }: HabitModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormData>({
    defaultValues: {
      name: "",
      description: "",
      frequency: "daily",
      customFrequency: "3",
      streakThreshold: 50,
    },
  });

  const freq = watch("frequency");

  useEffect(() => {
    if (habit) {
      reset({
        name: habit.name,
        description: habit.description ?? "",
        frequency: habit.frequency,
        customFrequency: habit.customFrequency ?? "3",
        streakThreshold: habit.streakThreshold,
      });
    } else {
      reset({
        name: "",
        description: "",
        frequency: "daily",
        customFrequency: "",
        streakThreshold: 50,
      });
    }
  }, [habit, reset]);

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-card-border bg-surface text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent";
  const labelCls =
    "block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(15,15,26,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="bg-sidebar px-5 py-4">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
            {habit ? "Edit habit" : "New habit"}
          </p>
          <p className="text-sm font-extrabold text-white mt-0.5">
            {habit ? habit.name : "Create a habit to track"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(async (d) => {
            await onSubmit(d);
            onClose();
          })}
          className="p-5 space-y-4"
        >
          <div>
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              placeholder="e.g. Morning run"
              {...register("name", {
                required: "Required",
                maxLength: { value: 100, message: "Max 100 chars" },
              })}
            />
            {errors.name && (
              <p className="text-danger-500 text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Optional details…"
              {...register("description")}
            />
          </div>

          <div>
            <label className={labelCls}>Frequency</label>
            <select className={inputCls} {...register("frequency")}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {freq === "custom" && (
            <div>
              <label className={labelCls}>
                Times per week
                <span className="normal-case font-normal tracking-normal ml-1 text-gray-400">
                  — streak counts weeks with this many completions
                </span>
              </label>
              <select
                className={inputCls}
                {...register("customFrequency", {
                  validate: (v) =>
                    freq !== "custom" || !!v || "Required",
                })}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} times per week
                  </option>
                ))}
              </select>
              {errors.customFrequency && (
                <p className="text-danger-500 text-xs mt-1">
                  {errors.customFrequency.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>
              Streak threshold
              <span className="normal-case font-normal tracking-normal ml-1 text-gray-400">
                — min % to count toward streak
              </span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              className={inputCls}
              {...register("streakThreshold", {
                required: true,
                min: { value: 1, message: "Min 1" },
                max: { value: 100, message: "Max 100" },
                valueAsNumber: true,
              })}
            />
            {errors.streakThreshold && (
              <p className="text-danger-500 text-xs mt-1">
                {errors.streakThreshold.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-accent-500 to-accent-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm"
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
              className="px-4 py-2.5 bg-surface hover:bg-gray-800 text-gray-400 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
