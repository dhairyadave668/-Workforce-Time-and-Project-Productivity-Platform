import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Briefcase,
  BarChart3,
  LogOut,
  ChevronLeft,
  Users,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import React, { memo, useCallback } from "react";
import { useAuth } from "../../../features/auth/hooks/useAuth";

interface SidebarProps {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(
  ({ isMobileOpen, isCollapsed, toggleSidebar }) => {
    const { userRole, logout } = useAuth();
    const normalizedRole = userRole?.toLowerCase().trim() || "";

    const handleLogout = useCallback(() => {
      logout();
    }, [logout]);

    const handleNavClick = () => {
      if (window.innerWidth < 768) {
        toggleSidebar();
      }
    };

    return (
      <div
        className={`
          fixed top-0 left-0 h-full z-50
          bg-gray-100 shadow-lg

          transform transition-transform duration-300 ease-in-out

          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0

          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center">
          {!isCollapsed && (
            <h1 className="text-lg font-semibold">Workforce</h1>
          )}

          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-white/20"
          >
            <ChevronLeft
              className={`transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-col h-[calc(100%-64px)] p-3">

          {/* MENU (SCROLLABLE) */}
          <div className="flex-1 space-y-2 overflow-y-auto">

            <MenuItem
              to="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              isCollapsed={isCollapsed}
              onClick={handleNavClick}
            />

            {normalizedRole === "employee" && (
              <>
                <MenuItem
                  to="/timesheets"
                  icon={Clock}
                  label="My Timesheets"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/projects"
                  icon={Briefcase}
                  label="Projects"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/tasks"
                  icon={CheckSquare}
                  label="My Tasks"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
              </>
            )}

            {normalizedRole === "admin" && (
              <>
                <MenuItem
                  to="/usermanager"
                  icon={Users}
                  label="User Management"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/projects"
                  icon={Briefcase}
                  label="Projects"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/tasks"
                  icon={ClipboardList}
                  label="Tasks"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/approvals"
                  icon={FileCheck}
                  label="Approvals"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/audit-logs"
                  icon={Clock}
                  label="Audit Logs"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
                <MenuItem
                  to="/reports"
                  icon={BarChart3}
                  label="Reports"
                  isCollapsed={isCollapsed}
                  onClick={handleNavClick}
                />
              </>
            )}
          </div>

          {/* LOGOUT (ALWAYS VISIBLE) */}
          <MenuItem
            icon={LogOut}
            label="Logout"
            isCollapsed={isCollapsed}
            danger
            onClick={handleLogout}
          />
        </div>
      </div>
    );
  }
);

Sidebar.displayName = "Sidebar";

/* ================= MENU ITEM ================= */

interface MenuItemProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isCollapsed: boolean;
  to?: string;
  danger?: boolean;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = memo(
  ({ icon: Icon, label, isCollapsed, to, danger, onClick }) => {
    const baseClass = `
      flex items-center
      ${isCollapsed ? "justify-center p-2" : "gap-3 p-3"}
      rounded-lg
      transition-all duration-200
      cursor-pointer
      ${
        danger
          ? "text-gray-600 hover:bg-gray-100"
          : "text-gray-600 "
      }
    `;

    const content = (
      <>
        <Icon size={20} />
        <span
          className={`
            text-sm whitespace-nowrap overflow-hidden
            transition-all duration-200
            ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"}
          `}
        >
          {label}
        </span>
      </>
    );

    if (!to) {
      return (
        <div onClick={onClick} className={baseClass}>
          {content}
        </div>
      );
    }

    return (
      <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
          `${baseClass} ${
            isActive ? "bg-indigo-500 text-white shadow-md" : ""
          }`
        }
      >
        {content}
      </NavLink>
    );
  }
);

MenuItem.displayName = "MenuItem";

export default Sidebar;