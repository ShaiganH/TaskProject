import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Tag,
  ScrollText,
  Download,
  LogOut,
  Shield,
  User,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./UI";
import { useState } from "react";

const NAV_MAIN = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/tasks", icon: CheckSquare, label: "My tasks" },
  { to: "/due-soon", icon: Clock, label: "Due soon" },
];
const NAV_WORKSPACE = [
  { to: "/categories", icon: Tag, label: "Categories" },
  { to: "/audit-log", icon: ScrollText, label: "Audit log" },
  { to: "/export", icon: Download, label: "Export / Import" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const link = ({ isActive }) =>
    `nav-item ${isActive ? "active sidebar-link-active" : ""}`;

  const handleNavClick = () => setMobileOpen(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-5 pb-6 flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight text-gray-900">
          Dock<span className="text-brand-400">et</span>
        </span>
        <button
          className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin">
        <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Main
        </p>
        <div className="space-y-0.5 mb-4">
          {NAV_MAIN.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={link} onClick={handleNavClick}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          Workspace
        </p>
        <div className="space-y-0.5 mb-4">
          {NAV_WORKSPACE.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={link} onClick={handleNavClick}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          {user?.role === "Admin" && (
            <NavLink to="/admin" className={link} onClick={handleNavClick}>
              <Shield size={15} />
              Admin panel
            </NavLink>
          )}
        </div>
      </nav>

      {/* User row */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-0.5">
        <NavLink to="/profile" className={link} onClick={handleNavClick}>
          <div className="flex items-center gap-3 px-1 pt-3 pb-1">
            <Avatar
              initials={
                (
                  (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")
                ).toUpperCase() || "??"
              }
              size="sm"
              imageUrl={user?.profilePictureUrl}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user?.firstName}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {user?.designation || "Team member"}
              </p>
            </div>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-100 flex items-center px-4 py-3 gap-3">
        <button
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
        <span className="text-base font-semibold tracking-tight text-gray-900">
          Task<span className="text-brand-400">Flow</span>
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col h-screen transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 min-w-[208px] bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
