import { useContext } from "react";
import { HabitContext } from "@/context/habitContext";

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used within HabitProvider");
  return ctx;
}
