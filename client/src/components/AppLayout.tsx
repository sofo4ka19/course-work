import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/dashboard", icon: "▦", label: "Dashboard" },
  { to: "/habits", icon: "✓", label: "Habits" },
  { to: "/analytics", icon: "↗", label: "Analytics" },
  { to: "/recommendations", icon: "✦", label: "Advice" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Sidebar (md+) ───────────────────────────── */}
      <aside className="hidden md:flex w-48 shrink-0 bg-sidebar flex-col">
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <p className="text-sm font-extrabold text-white tracking-tight">
            Habitflow
          </p>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Track · Analyze · Improve
          </p>
        </div>

        <nav className="flex-1 px-2 py-2.5 space-y-0.5">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  isActive ? "bg-accent-500/[0.18]" : "hover:bg-white/[0.04]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-[26px] h-[26px] rounded-md flex items-center justify-center text-xs shrink-0 ${
                      isActive
                        ? "bg-gradient-to-br from-accent-500 to-accent-400 text-white"
                        : "bg-white/[0.05] text-white/50"
                    }`}
                  >
                    {icon}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-white" : "text-white/60"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 pb-4 pt-2.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {initials}
            </div>
            <p
              className="text-[10px] truncate"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] transition-colors text-white/25 hover:text-white/60 hover:bg-white/[0.04] mt-0.5"
          >
            <span>→</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ───────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar flex items-center justify-between px-4 border-b border-white/[0.06]">
        <p className="text-sm font-extrabold text-white tracking-tight">
          Habitflow
        </p>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {initials}
          </div>
        </button>
      </header>

      {/* ── Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ───────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-white/[0.06] flex">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? "text-accent-400" : "text-white/40"
              }`
            }
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[9px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
