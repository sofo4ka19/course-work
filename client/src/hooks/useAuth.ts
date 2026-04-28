import { useContext } from "react";
import { AuthContext } from "@/context/authContext";
import type { AuthContextType } from "@/context/authContext";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
