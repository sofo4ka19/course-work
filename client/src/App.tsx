import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import PrivateRoute from "@/router/PrivateRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import { HabitProvider } from "./context/HabitProvider";
import HabitsPage from "@/pages/HabitsPage";
import DashboardPage from "@/pages/DashboardPage";
import AnalyticsPage from "@/pages/AnalyticsPage";

function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute>
      <HabitProvider>
        <AppLayout>{children}</AppLayout>
      </HabitProvider>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/habits"
            element={
              <PrivateLayout>
                <HabitsPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateLayout>
                <DashboardPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateLayout>
                <AnalyticsPage />
              </PrivateLayout>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
