import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);

    const listener = () => setMatches(media.matches);

    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /* ✅ LOGIC */
  const effectiveCollapsed = isMobile ? false : isCollapsed;
  const sidebarVisible = isMobile ? isMobileOpen : true;

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* ✅ SIDEBAR */}
      <Sidebar
        isMobileOpen={sidebarVisible}
        isCollapsed={effectiveCollapsed}
        toggleSidebar={toggleSidebar}
      />

      {/* ✅ OVERLAY (MOBILE ONLY) */}
      {isMobile && sidebarVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ✅ MAIN CONTENT WRAPPER */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-300

          ${!isMobile && (isCollapsed ? "md:ml-20" : "md:ml-64")}
        `}
      >

        {/* NAVBAR */}
        <Navbar toggleSidebar={toggleSidebar} />

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>

      </div>
    </div>
  );
};

export default MainLayout;