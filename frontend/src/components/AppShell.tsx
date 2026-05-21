import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/tasks" className="brand">
          <span className="brand-mark">CA</span>
          <span>
            <strong>Carbon Arc Tasks</strong>
            <small>Operational task workspace</small>
          </span>
        </Link>
        <button className="button ghost" onClick={handleLogout} type="button">
          Sign out
        </button>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}

