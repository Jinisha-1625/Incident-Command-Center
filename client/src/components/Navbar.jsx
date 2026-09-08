import { NavLink } from "react-router-dom";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm ${isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
          <Radio className="h-5 w-5 text-red-500" />
          Incident Command
        </NavLink>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            Board
          </NavLink>
          <NavLink to="/team" className={linkClass}>
            Team
          </NavLink>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <div className="font-medium text-slate-100">{user?.name}</div>
            <div className="text-xs capitalize text-slate-500">{user?.role}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
