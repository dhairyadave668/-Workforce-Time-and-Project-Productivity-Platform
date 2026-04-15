import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const { email, userRole, logout, userDisplayName } = useAuth();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getPageTitle = (pathname: string): string => {
    const path = pathname.split("/").filter(Boolean);
    const base = path[0] || "dashboard";

    const routeMap: Record<string, string> = {
      dashboard: "Dashboard",
      timesheets: "Timesheets",
      projects: "Projects",
      tasks: "Tasks",
      usermanager: "User Management",
      approvals: "Approvals",
      "audit-logs": "Audit Logs",
      reports: "Reports",
    };

    return routeMap[base] || "Dashboard";
  };

  const pageTitle = getPageTitle(location.pathname);
  const userEmail = email ?? "User";
  const userName = userDisplayName || email?.split('@')[0] || "User";
  
  // Get initials from display name or email
  const getInitials = () => {
    if (userDisplayName) {
      const nameParts = userDisplayName.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
      }
      return userDisplayName.charAt(0).toUpperCase();
    }
    return userEmail.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by your auth logic
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
  <div className="bg-white shadow-sm px-3 md:px-4 py-2.5 flex justify-between items-center sticky top-0 z-40">
    
    <div className="flex items-center gap-2 md:gap-3">
      <button
        onClick={toggleSidebar}
        className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-base md:text-lg font-semibold text-gray-800 truncate">
        {pageTitle}
      </h1>
    </div>

    <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
      
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
      >
        {/* Smaller Avatar */}
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
          {getInitials()}
        </div>

        {/* Smaller Text */}
        <div className="hidden md:block">
          <p className="text-xs font-medium text-gray-800 max-w-[160px] truncate">
            {userName}
          </p>
          <p className="text-[10px] text-gray-500">{userRole}</p>
        </div>
      </div>

      {open && (
        <div className="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-md border overflow-hidden z-50">
          
          <div className="p-3 border-b bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">
              {userName}
            </p>
            <p className="text-xs text-gray-600 mt-1 break-all">
              {userEmail}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {userRole}
            </p>
          </div>

          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut size={16} />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>

        </div>
      )}
    </div>
  </div>
);
};

export default Navbar;