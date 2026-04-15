import { useReducer } from "react";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
// import { useMsal } from "@azure/msal-react";
import { useAuth } from "../../../features/auth/hooks/useAuth"
import MainLayout from "@/shared/components/layout/MainLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAuditLogs } from "../api/auditApi";
import type { AuditLog } from "../types/auditTypes";

const LOGS_PER_PAGE = 10;

// ─── Page State Reducer ───────────────────────────────────────────────────────

type PageState = {
  currentPage: number;
  searchQuery: string;
  selectedRole: string;
  sortDir: "asc" | "desc";
};

type PageAction =
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_ROLE"; payload: string }
  | { type: "SET_SORT_DIR"; payload: "asc" | "desc" }
  | { type: "CLEAR_FILTERS" };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case "SET_SELECTED_ROLE":
      return { ...state, selectedRole: action.payload, currentPage: 1 };
    case "SET_SORT_DIR":
      return { ...state, sortDir: action.payload };
    case "CLEAR_FILTERS":
      return { ...state, searchQuery: "", selectedRole: "all", currentPage: 1 };
    default:
      return state;
  }
};

// ─── Action Badge Helper ──────────────────────────────────────────────────────

const getActionBadgeStyles = (action: string) => {
  if (action.includes("CREATE"))  return "bg-green-50 text-green-700 border-green-100";
  if (action.includes("APPROVE")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (action.includes("REJECT"))  return "bg-red-50 text-red-700 border-red-100";
  if (action.includes("SUBMIT"))  return "bg-blue-50 text-blue-700 border-blue-100";
  if (action === "LOGIN")         return "bg-gray-50 text-gray-700 border-gray-100";
  return "bg-gray-50 text-gray-700 border-gray-100";
};

// ─── Skeleton Components ──────────────────────────────────────────────────────

const DesktopSkeleton = () => (
  <div className="hidden sm:flex flex-col h-full">
    <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-80 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="w-40 h-9 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-28 h-8 bg-gray-200 rounded-lg animate-pulse" />
          <div className="ml-auto w-16 h-5 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
              <tr>
                <th className="px-5 py-3.5 text-left">Timestamp</th>
                <th className="px-5 py-3.5 text-left">User</th>
                <th className="px-5 py-3.5 text-left">Action</th>
                <th className="px-5 py-3.5 text-left">Target</th>
                <th className="px-5 py-3.5 text-left">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: LOGS_PER_PAGE }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="h-6 bg-gray-200 rounded-full w-20" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 z-40 bg-white border-t shadow-lg mt-4 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-10 h-8 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MobileSkeleton = () => (
  <div className="sm:hidden h-full w-full max-w-full overflow-x-hidden overflow-y-auto">
    <div className="px-4 py-4">
      {/* Header */}
      <div className="h-5 bg-gray-200 rounded w-48 mb-4 animate-pulse" />

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border shadow-sm mb-4 p-4">
        <div className="w-full h-10 bg-gray-200 rounded-xl animate-pulse mb-3" />
        <div className="flex items-center gap-2">
          <div className="flex-1 h-9 bg-gray-200 rounded-lg animate-pulse" />
          <div className="w-16 h-9 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 animate-pulse">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-28" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-24" />
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border">
              <div className="h-3 bg-gray-200 rounded w-12 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 border">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function AuditLogPage() {
  // const { accounts } = useMsal();
const { entraId } = useAuth()
  const [pageState, dispatch] = useReducer(pageReducer, {
    currentPage: 1,
    searchQuery: "",
    selectedRole: "all",
    sortDir: "desc",
  });

  const { currentPage, searchQuery, selectedRole, sortDir } = pageState;


const { data: logs = [], isLoading, error } = useQuery<AuditLog[], Error>({
  queryKey: ["auditLogs", entraId],
  enabled: !!entraId,
  queryFn: () => fetchAuditLogs(entraId!),
});
  // Unique roles from data
  const roles = (() => {
    const uniqueRoles = new Set(
      logs
        .map((log) => log.roleName)
        .filter((role): role is string => role !== null && role !== undefined)
    );
    return ["all", ...Array.from(uniqueRoles).sort()];
  })();

  // Filter + sort
  const filteredAndSortedLogs = (() => {
    let filtered = [...logs];

    if (selectedRole !== "all") {
      filtered = filtered.filter((log) => log.roleName === selectedRole);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.metadata.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) =>
      sortDir === "desc"
        ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return filtered;
  })();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = (() => {
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredAndSortedLogs.slice(start, start + LOGS_PER_PAGE);
  })();

  const hasActiveFilters = searchQuery !== "" || selectedRole !== "all";
  const clearFilters = () => dispatch({ type: "CLEAR_FILTERS" });

  // ── Loading State ──
  if (isLoading) {
    return (
      <MainLayout>
        <DesktopSkeleton />
        <MobileSkeleton />
      </MainLayout>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <MainLayout>
        <div className="h-full overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-2">Failed to load audit logs</p>
                <p className="text-gray-400 text-sm">{error.message}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // ── Main Content ──
  return (
    <MainLayout>
      {/* ════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════ */}
      <div className="hidden sm:flex flex-col h-full">
        <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 flex flex-col h-full">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm">
              Tracking all critical system actions for compliance and security auditing.
            </p>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col flex-1 min-h-0">

            {/* Toolbar */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              {/* Search */}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by user, action, target..."
                  value={searchQuery}
                  onChange={(e) => dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value })}
                  className="w-full pl-9 pr-4 rounded-xl border border-gray-300 bg-gray-50 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white"
                />
              </div>

              {/* Role Filter */}
              <div className="w-40">
                <Select
                  value={selectedRole}
                  onValueChange={(value) => dispatch({ type: "SET_SELECTED_ROLE", payload: value })}
                >
                  <SelectTrigger className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border bg-white p-1 max-h-36 overflow-y-auto">
                    {roles.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="cursor-pointer text-xs py-1.5 hover:bg-indigo-50 focus:bg-indigo-100"
                      >
                        {role === "all" ? "All Roles" : role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Toggle */}
              <button
                onClick={() =>
                  dispatch({ type: "SET_SORT_DIR", payload: sortDir === "desc" ? "asc" : "desc" })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-600 hover:bg-gray-50 transition"
              >
                <span>Sort by date</span>
                <span className="text-gray-400">{sortDir === "desc" ? "↓" : "↑"}</span>
              </button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}

              {/* Entry Count */}
              <span className="ml-auto text-sm text-gray-400">
                {filteredAndSortedLogs.length}{" "}
                {filteredAndSortedLogs.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Timestamp</th>
                    <th className="px-5 py-3.5 text-left">User</th>
                    <th className="px-5 py-3.5 text-left">Action</th>
                    <th className="px-5 py-3.5 text-left">Target</th>
                    <th className="px-5 py-3.5 text-left">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center text-gray-400 text-sm">
                        {hasActiveFilters ? (
                          <div className="flex flex-col items-center gap-2">
                            <p>No logs match your filters.</p>
                            <button
                              onClick={clearFilters}
                              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                              Clear all filters
                            </button>
                          </div>
                        ) : (
                          "No audit logs found."
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                          {log.timestamp}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                              {log.userName[0]?.toUpperCase() || "U"}
                            </div>
                            <span className="font-medium text-gray-800">{log.userName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getActionBadgeStyles(log.action)}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 font-mono text-xs break-all">
                          {log.target}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-gray-400 break-all">
                          {log.metadata}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Desktop Pagination */}
          {filteredAndSortedLogs.length > 0 && (
            <div className="sticky bottom-0 z-40 bg-white border-t shadow-lg mt-4 rounded-2xl overflow-hidden">
              <div className="px-4 py-3">
                <div className="hidden sm:flex items-center justify-center gap-3">
                
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm"
                    >
                      Prev
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button
                          key={i}
                          onClick={() => dispatch({ type: "SET_PAGE", payload: pageNum })}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentPage === pageNum
                              ? "bg-indigo-600 text-white"
                              : "border hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="px-1">...</span>
                        <button
                          onClick={() => dispatch({ type: "SET_PAGE", payload: totalPages })}
                          className="px-3 py-1 rounded-lg text-sm border hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        dispatch({ type: "SET_PAGE", payload: Math.min(currentPage + 1, totalPages) })
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════ */}
      <div className="sm:hidden h-full w-full max-w-full overflow-x-hidden overflow-y-auto">
        <div className="px-4 py-4">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-500 text-sm">
              Tracking all critical system actions for compliance and security auditing.
            </p>
          </div>

          {/* Mobile Toolbar */}
          <div className="bg-white rounded-2xl border shadow-sm mb-4 p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by user, action, target..."
                value={searchQuery}
                onChange={(e) => dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value })}
                className="w-full pl-9 pr-4 rounded-xl border border-gray-300 bg-gray-50 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={selectedRole}
                  onValueChange={(value) => dispatch({ type: "SET_SELECTED_ROLE", payload: value })}
                >
                  <SelectTrigger className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border bg-white p-1 max-h-36 overflow-y-auto">
                    {roles.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="cursor-pointer text-xs py-1.5 hover:bg-indigo-50 focus:bg-indigo-100"
                      >
                        {role === "all" ? "All Roles" : role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={() =>
                  dispatch({ type: "SET_SORT_DIR", payload: sortDir === "desc" ? "asc" : "desc" })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-600 hover:bg-gray-50 transition"
              >
                <span>Sort</span>
                <span className="text-gray-400">{sortDir === "desc" ? "↓" : "↑"}</span>
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-3">
            {paginatedLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
                {hasActiveFilters ? (
                  <div className="text-center">
                    <p>No logs match your filters.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  "No audit logs found."
                )}
              </div>
            ) : (
              paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3"
                >
                  {/* User + Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {log.userName[0]?.toUpperCase() || "U"}
                      </div>
                      <p className="font-semibold text-gray-800 text-sm truncate">{log.userName}</p>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-gray-400">{log.timestamp}</span>
                  </div>

                  {/* Action Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getActionBadgeStyles(log.action)}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {log.action}
                    </span>
                  </div>

                  {/* Target */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 border">
                    <p className="text-xs text-gray-500 mb-1">Target</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{log.target}</p>
                  </div>

                  {/* Metadata */}
                  {log.metadata && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 border">
                      <p className="text-xs text-gray-500 mb-1">Metadata</p>
                      <p className="text-xs font-mono text-gray-500 break-all">{log.metadata}</p>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Mobile Pagination */}
            {filteredAndSortedLogs.length > 0 && (
              <div className="mt-4 bg-white border rounded-3xl px-4 py-3 shadow-md">
                <div className="flex flex-col gap-2">
                  
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => dispatch({ type: "SET_PAGE", payload: i + 1 })}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === i + 1
                            ? "bg-indigo-600 text-white"
                            : "border hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {totalPages > 10 && <span className="text-gray-400 text-xs">...</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() =>
                        dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })
                      }
                      disabled={currentPage === 1}
                      className="flex-1 py-2 border rounded-xl text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() =>
                        dispatch({ type: "SET_PAGE", payload: Math.min(currentPage + 1, totalPages) })
                      }
                      disabled={currentPage === totalPages}
                      className="flex-1 py-2 border rounded-xl text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}