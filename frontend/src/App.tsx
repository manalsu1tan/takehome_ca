import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TaskListPage } from "./pages/TaskListPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Keep route protection declarative so pages can assume a token exists.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppShell>
              <TaskListPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute>
            <AppShell>
              <TaskDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
