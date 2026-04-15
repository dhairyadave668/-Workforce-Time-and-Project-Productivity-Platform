import { useState } from "react";
import {
  Eye,
  FileText,
  FileX2,
  ChevronLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  CalendarDays,
  X,
  ChevronRight,
} from "lucide-react";
import MainLayout from "../../../shared/components/layout/MainLayout";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchTimesheets, fetchEntries, updateRemark } from "../api/Approvelapi";
import type { TimesheetHistory, TimesheetEntry } from "../types/approvalTypes";
import { useAuth } from "../../../features/auth/hooks/useAuth";

type DayData = { hours: number; note?: string };
type GroupedRow = {
  projectName: string | null;
  taskName: string;
  days: Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri", DayData>;
};

function isSameDay(a: string | Date, b: Date) {
  const da = new Date(a);
  return (
    da.getFullYear() === b.getFullYear() &&
    da.getMonth() === b.getMonth() &&
    da.getDate() === b.getDate()
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(weekStart: Date): Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri", Date> {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
  const result = {} as Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri", Date>;
  days.forEach((d, i) => {
    const dt = new Date(weekStart);
    dt.setDate(dt.getDate() + i);
    result[d] = dt;
  });
  return result;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Skeleton Components ── */
function SkeletonCell({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />;
}

function ApprovalSkeletonLoader() {
  return (
    <MainLayout>
      <div className="flex flex-col h-full px-4 sm:px-6 lg:px-8 py-4 gap-4 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <SkeletonCell className="h-4 w-64" />
          <SkeletonCell className="h-9 w-32 rounded-xl" />
        </div>
        <div className="hidden sm:grid grid-cols-3 gap-3 shrink-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border px-4 py-3 bg-gray-50 border-gray-100">
              <SkeletonCell className="w-4 h-4 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5">
                <SkeletonCell className="h-3 w-24" />
                <SkeletonCell className="h-5 w-8" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 min-h-0">
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  {["Employee", "Week Date", "Status", "Submitted", "Remark", "Action"].map((col) => (
                    <th key={col} className="px-5 py-3.5 text-left">
                      <SkeletonCell className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><SkeletonCell className="h-3.5 w-24" /></td>
                    <td className="px-5 py-4"><SkeletonCell className="h-3.5 w-28" /></td>
                    <td className="px-5 py-4"><SkeletonCell className="h-6 w-20 rounded-full" /></td>
                    <td className="px-5 py-4"><SkeletonCell className="h-3.5 w-32" /></td>
                    <td className="px-5 py-4"><SkeletonCell className="h-6 w-20 rounded-full" /></td>
                    <td className="px-5 py-4"><SkeletonCell className="h-7 w-16 rounded-lg" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:hidden overflow-y-auto flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 animate-pulse">
              <div className="flex justify-between items-center">
                <SkeletonCell className="h-3.5 w-24" />
                <SkeletonCell className="h-6 w-16 rounded-full" />
              </div>
              <SkeletonCell className="h-3 w-28" />
              <SkeletonCell className="h-6 w-28 rounded-full" />
              <SkeletonCell className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ApprovalPage() {
  const { entraId } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [remark, setRemark] = useState("");
  const [notePage, setNotePage] = useState<{
    note: string;
    day: string;
    task: string;
    project: string | null;
  } | null>(null);
  const [selected, setSelected] = useState<TimesheetHistory | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "given" | "pending">("all");

  const today = new Date();
  const [calOpen, setCalOpen] = useState(false);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  const queryClient = useQueryClient();

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["timesheets"],
    queryFn: fetchTimesheets,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery<TimesheetEntry[]>({
    queryKey: ["entries", entraId],
    queryFn: () => fetchEntries(entraId!),
    enabled: !!entraId,
  });

  const remarkMutation = useMutation({
    mutationFn: (data: { timesheetId: string; adminRemarks: string; entraId: string; }) =>
      updateRemark(data),
    onMutate: () => {
      toast.loading("Submitting remark...");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setRemark("");
      setSelected(null);
      toast.dismiss();
      toast.success("Submitted successfully");
    },
    onError: () => {
      toast.dismiss();
      toast.error("Failed to submit ❌");
    },
  });

  const isLoading = loadingTimesheets || loadingEntries;

  if (isLoading) {
    return <ApprovalSkeletonLoader />;
  }

  /* ── Helper Functions ── */
  const remarkGiven = (timesheetId: string) => !!getEntry(timesheetId)?.adminRemarks;
  
  const getEntry = (timesheetId: string) => entries.find((e) => e.timesheetId === timesheetId);

  /* ── Filtered Timesheets with Status Filter ── */
  const filteredTimesheets = (() => {
    let data = timesheets.filter((t) => t.status?.toLowerCase() !== "draft");
    
    if (filterDate) {
      data = data.filter((t) => isSameDay(t.entryDate, filterDate));
    }
    
    if (activeFilter === "given") {
      data = data.filter((t) => remarkGiven(t.id));
    } else if (activeFilter === "pending") {
      data = data.filter((t) => !remarkGiven(t.id));
    }
    
    return data;
  })();

  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);
  const paginatedTimesheets = filteredTimesheets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ── Stats Values ── */
  const totalSubmissions = timesheets.filter((t) => t.status?.toLowerCase() !== "draft").length;
  const givenCount = timesheets.filter((t) => remarkGiven(t.id)).length;
  const pendingCount = timesheets.filter((t) => !remarkGiven(t.id)).length;
  const matchingDateCount = timesheets.filter((t) => filterDate && isSameDay(t.entryDate, filterDate) && t.status?.toLowerCase() !== "draft").length;

  const filteredEntries = selected ? entries.filter((e) => e.timesheetId === selected.id) : [];
  const weekDates = selected ? getWeekDates(getWeekStart(new Date(selected.entryDate))) : null;

  const grouped = (() => {
    const map: Record<string, GroupedRow> = {};
    filteredEntries.forEach((e) => {
      const key = `${e.projectName}-${e.taskName}`;
      if (!map[key]) {
        map[key] = {
          projectName: e.projectName,
          taskName: e.taskName,
          days: {
            Mon: { hours: 0 },
            Tue: { hours: 0 },
            Wed: { hours: 0 },
            Thu: { hours: 0 },
            Fri: { hours: 0 },
          },
        };
      }
      const day = new Date(e.entryDate).toLocaleDateString("en-US", {
        weekday: "short",
      }) as keyof GroupedRow["days"];
      if (map[key].days[day]) {
        map[key].days[day].hours += e.hours;
        if (e.note) map[key].days[day].note = e.note;
      }
    });
    return Object.values(map);
  })();

  const grandTotalHours = grouped.reduce((total, row) => {
    return (
      total +
      row.days.Mon.hours +
      row.days.Tue.hours +
      row.days.Wed.hours +
      row.days.Thu.hours +
      row.days.Fri.hours
    );
  }, 0);

  const activeDates = new Set(
    timesheets.map((t) => {
      const d = new Date(t.entryDate);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const hasEntry = (day: number) => activeDates.has(`${calYear}-${calMonth}-${day}`);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    setFilterDate(d);
    setCalOpen(false);
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setFilterDate(null);
    setActiveFilter("all");
    setCurrentPage(1);
  };

  const formatDay = (date: Date) => String(date.getDate()).padStart(2, "0");

  return (
    <MainLayout>
      <div className="flex flex-col h-full px-4 sm:px-6 lg:px-8 py-4 gap-4 overflow-hidden">
        {/* ── PAGE HEADER ── */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <p className="text-gray-500 text-sm mt-0.5">
              Review and manage employee timesheets
            </p>
          </div>

          {/* ── CALENDAR TRIGGER ── */}
          <div className="relative">
            <div className="flex items-center gap-2">
              {filterDate && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
                  {filterDate.toDateString()}
                  <button onClick={clearFilter} className="hover:text-indigo-900">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={() => setCalOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-600 text-sm font-medium transition-colors"
              >
                <CalendarDays size={15} />
                <span className="hidden sm:inline">
                  {filterDate ? "Change date" : "Filter by date"}
                </span>
              </button>
            </div>

            {/* ── CALENDAR DROPDOWN — DESKTOP ── */}
            {calOpen && (
              <div className="hidden sm:block absolute right-0 top-11 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-sm font-semibold text-gray-800">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
                    <ChevronRight size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-5 mb-1">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-y-1">
                  {Array.from({ length: firstDay === 0 ? 4 : firstDay === 6 ? 4 : firstDay - 1 }, (_, i) => <div key={`blank-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dayOfWeek = new Date(calYear, calMonth, day).getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
                    const isSelected = filterDate && filterDate.getFullYear() === calYear && filterDate.getMonth() === calMonth && filterDate.getDate() === day;
                    const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
                    const hasData = hasEntry(day);
                    return (
                      <button
                        key={day}
                        onClick={() => selectDay(day)}
                        className={`relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-sm transition-colors
                          ${isSelected ? "bg-indigo-600 text-white font-semibold" : isToday ? "border border-indigo-300 text-indigo-600 font-medium hover:bg-indigo-50" : "hover:bg-gray-100 text-gray-700"}`}
                      >
                        {day}
                        {hasData && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-indigo-200" : "bg-indigo-400"}`} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" /> has timesheets
                  </span>
                  {filterDate && <button onClick={clearFilter} className="text-xs text-red-400 hover:text-red-600 transition">Clear filter</button>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE CALENDAR BOTTOM SHEET ── */}
        {calOpen && (
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCalOpen(false)} />
            <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 z-10">
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Filter by Date</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tap a date to filter timesheets</p>
                </div>
                <button onClick={() => setCalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <X size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-2xl px-4 py-3">
                <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border text-gray-600">
                  <ChevronLeft size={17} />
                </button>
                <span className="text-base font-bold text-gray-800">{MONTH_NAMES[calMonth]} {calYear}</span>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border text-gray-600">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="grid grid-cols-5 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-400 py-1 font-semibold">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-y-1.5">
                {Array.from({ length: firstDay === 0 ? 4 : firstDay === 6 ? 4 : firstDay - 1 }, (_, i) => <div key={`blank-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayOfWeek = new Date(calYear, calMonth, day).getDay();
                  if (dayOfWeek === 0 || dayOfWeek === 6) return null;
                  const isSelected = filterDate && filterDate.getFullYear() === calYear && filterDate.getMonth() === calMonth && filterDate.getDate() === day;
                  const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
                  const hasData = hasEntry(day);
                  return (
                    <button
                      key={day}
                      onClick={() => selectDay(day)}
                      className={`relative flex flex-col items-center justify-center h-11 w-full rounded-xl text-sm font-medium transition-all active:scale-95
                        ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : isToday ? "border-2 border-indigo-400 text-indigo-600 bg-indigo-50" : hasData ? "bg-indigo-50/60 text-gray-800 hover:bg-indigo-100" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      {day}
                      {hasData && !isSelected && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-indigo-400" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Has timesheets</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border-2 border-indigo-400 inline-block" /> Today</span>
                </div>
                {filterDate && (
                  <button onClick={() => { clearFilter(); setCalOpen(false); }} className="text-xs font-medium text-red-400 hover:text-red-600 transition px-3 py-1.5 rounded-lg bg-red-50">
                    Clear filter
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE FILTER INDICATOR ── */}
        {activeFilter !== "all" && (
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg shrink-0">
            <span className="text-gray-500">Showing:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
              {activeFilter === "given" ? "✅ Remarks Given" : "⏳ Pending Remarks"}
            </span>
            <button
              onClick={() => setActiveFilter("all")}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* ── STATS STRIP - DESKTOP (Clickable) ── */}
        <div className="hidden sm:grid grid-cols-3 gap-3 shrink-0">
          <button
            onClick={() => { setActiveFilter("given"); setCurrentPage(1); }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left w-full ${
              activeFilter === "given" ? "bg-green-100 border-green-300 ring-2 ring-green-200" : "bg-green-50 border-green-100"
            } hover:opacity-80 hover:shadow-md`}
          >
            <div className="shrink-0"><CheckCircle2 size={16} className="text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Remarks Given</p>
              <p className={`text-lg font-bold text-green-600`}>{givenCount}</p>
            </div>
          </button>

          <button
            onClick={() => { setActiveFilter("pending"); setCurrentPage(1); }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left w-full ${
              activeFilter === "pending" ? "bg-amber-100 border-amber-300 ring-2 ring-amber-200" : "bg-amber-50 border-amber-100"
            } hover:opacity-80 hover:shadow-md`}
          >
            <div className="shrink-0"><Clock size={16} className="text-amber-500" /></div>
            <div>
              <p className="text-xs text-gray-500">Pending Remarks</p>
              <p className={`text-lg font-bold text-amber-600`}>{pendingCount}</p>
            </div>
          </button>

          <button
            onClick={() => { setActiveFilter("all"); setCurrentPage(1); }}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left w-full ${
              activeFilter === "all" ? "bg-indigo-100 border-indigo-300 ring-2 ring-indigo-200" : "bg-indigo-50 border-indigo-100"
            } hover:opacity-80 hover:shadow-md`}
          >
            <div className="shrink-0"><MessageSquare size={16} className="text-indigo-500" /></div>
            <div>
              <p className="text-xs text-gray-500">{filterDate ? "Matching Date" : "Total Submissions"}</p>
              <p className={`text-lg font-bold text-indigo-600`}>{filterDate ? matchingDateCount : totalSubmissions}</p>
            </div>
          </button>
        </div>

        {/* ── STATS STRIP - MOBILE (Clickable) ── */}
        <div className="sm:hidden grid grid-cols-3 gap-2 shrink-0">
          <button
            onClick={() => { setActiveFilter("given"); setCurrentPage(1); }}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
              activeFilter === "given" ? "bg-green-100 border-green-300" : "bg-green-50 border-green-100"
            }`}
          >
            <div className="text-xs text-gray-500">Given</div>
            <div className="text-lg font-bold text-green-600">{givenCount}</div>
          </button>

          <button
            onClick={() => { setActiveFilter("pending"); setCurrentPage(1); }}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
              activeFilter === "pending" ? "bg-amber-100 border-amber-300" : "bg-amber-50 border-amber-100"
            }`}
          >
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-lg font-bold text-amber-600">{pendingCount}</div>
          </button>

          <button
            onClick={() => { setActiveFilter("all"); setCurrentPage(1); }}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
              activeFilter === "all" ? "bg-indigo-100 border-indigo-300" : "bg-indigo-50 border-indigo-100"
            }`}
          >
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-bold text-indigo-600">{filterDate ? matchingDateCount : totalSubmissions}</div>
          </button>
        </div>

        {/* ── DESKTOP TABLE ── */}
        <div className="hidden sm:block bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 min-h-0">
          <div className="h-full overflow-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left">Employee</th>
                  <th className="px-5 py-3.5 text-left">Week Date</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-left">Submitted</th>
                  <th className="px-5 py-3.5 text-center">Remark</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedTimesheets.map((t) => {
                  const user = getEntry(t.id)?.userName;
                  const hasRemark = remarkGiven(t.id);
                  const remarkText = getEntry(t.id)?.adminRemarks;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                            {(user || "U")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{user || "User"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{new Date(t.entryDate).toDateString()}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{t.submittedAt ? new Date(t.submittedAt).toLocaleString() : "Draft"}</td>
                      <td className="px-5 py-4 text-center">
                        {hasRemark ? (
                          <span title={remarkText} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100 cursor-default">
                            <CheckCircle2 size={12} /> Given
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-400 text-xs font-medium border border-red-100">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelected(t);
                            setRemark(getEntry(t.id)?.adminRemarks || "");
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors text-xs font-medium"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedTimesheets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">
                      {filterDate ? `No timesheets found for ${filterDate.toDateString()}.` : activeFilter !== "all" ? `No ${activeFilter === "given" ? "remarks given" : "pending remarks"} timesheets found.` : "No timesheets found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── MOBILE CARDS ── */}
        <div className="flex flex-col gap-3 sm:hidden overflow-y-auto flex-1">
          {paginatedTimesheets.map((t) => {
            const user = getEntry(t.id)?.userName;
            const hasRemark = remarkGiven(t.id);
            const remarkText = getEntry(t.id)?.adminRemarks;
            return (
              <div key={t.id} className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                      {(user || "U")[0].toUpperCase()}
                    </div>
                    <p className="font-semibold text-gray-800">{user || "User"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">{t.status}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{new Date(t.entryDate).toDateString()}</span>
                  <span>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : "Draft"}</span>
                </div>
                {hasRemark ? (
                  <span title={remarkText} className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                    <CheckCircle2 size={12} /> Remark Given
                  </span>
                ) : (
                  <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-400 text-xs font-medium border border-red-100">
                    <Clock size={12} /> Remark Pending
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelected(t);
                    setRemark(getEntry(t.id)?.adminRemarks || "");
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 border rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Eye size={15} /> View Timesheet
                </button>
              </div>
            );
          })}
          {paginatedTimesheets.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              {filterDate ? `No timesheets found for ${filterDate.toDateString()}.` : activeFilter !== "all" ? `No ${activeFilter === "given" ? "remarks given" : "pending remarks"} timesheets found.` : "No timesheets found."}
            </div>
          )}
          
          {/* Mobile Pagination */}
          {filteredTimesheets.length > 0 && (
            <div className="bg-white border rounded-xl px-4 py-3 flex flex-col items-center justify-between gap-3 shadow-sm mt-2">
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm">Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button key={i} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 rounded-lg text-sm ${currentPage === pageNum ? "bg-indigo-600 text-white" : "border hover:bg-gray-50"}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* ── DESKTOP PAGINATION ── */}
        {filteredTimesheets.length > 0 && (
          <div className="hidden sm:block sticky bottom-0 z-40 bg-white border rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md shrink-0">
            
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm">Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button key={i} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 rounded-lg text-sm ${currentPage === pageNum ? "bg-indigo-600 text-white" : "border hover:bg-gray-50"}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:w-[900px] max-h-[95vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
            <div className="px-5 sm:px-6 py-4 border-b flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Timesheet Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Week of {weekDates ? `${weekDates.Mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates.Fri.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : new Date(selected.entryDate).toDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {remarkGiven(selected.id) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                    <CheckCircle2 size={12} /> Remark Given
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-400 text-xs font-medium border border-red-100">
                    <Clock size={12} /> Remark Pending
                  </span>
                )}
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition">✕</button>
              </div>
            </div>

            <div className="overflow-auto px-4 sm:px-6 py-4 flex-1">
              <table className="w-full text-sm border-separate border-spacing-y-2 min-w-[520px]">
                <thead className="text-gray-400 text-xs uppercase sticky top-0 bg-white z-10">
                  <tr>
                    <th className="text-left px-4 py-2">Project</th>
                    <th className="text-left px-4 py-2">Task</th>
                    {weekDates ? (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((day) => (
                      <th key={day} className="px-4 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold text-gray-600">{day}</span>
                          <span className="text-[10px] font-medium text-indigo-400 bg-indigo-50 rounded-md px-1.5 py-0.5">{formatDay(weekDates[day])}</span>
                        </div>
                      </th>
                    )) : (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((day) => (
                      <th key={day} className="px-4 py-2 text-center">{day}</th>
                    ))}
                    <th className="px-4 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((row, i) => {
                    const total = row.days.Mon.hours + row.days.Tue.hours + row.days.Wed.hours + row.days.Thu.hours + row.days.Fri.hours;
                    return (
                      <tr key={i} className="bg-gray-50 hover:bg-gray-100 rounded-xl transition">
                        <td className="px-3 py-3 font-medium text-gray-700 rounded-l-xl">{row.projectName || "No Project"}</td>
                        <td className="px-3 py-3 text-gray-600">{row.taskName}</td>
                        {Object.entries(row.days).map(([day, data]) => (
                          <td key={day} className="text-center px-4 py-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-medium text-gray-800">{data.hours}</span>
                              {data.note ? (
                                <FileText size={15} className="cursor-pointer text-indigo-500 hover:text-indigo-700" onClick={() => { setSelected(null); setNotePage({ note: data.note!, day, task: row.taskName, project: row.projectName }); }} />
                              ) : (
                                <FileX2 size={15} className="text-gray-300 cursor-not-allowed" />
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-semibold text-gray-800 rounded-r-xl">{total}</td>
                      </tr>
                    );
                  })}
                  {grouped.length > 0 && (
                    <tr className="bg-indigo-50 rounded-xl">
                      <td colSpan={2} className="px-3 py-3 font-semibold text-gray-800 rounded-l-xl">Total</td>
                      {(["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map((day) => (
                        <td key={day} className="text-center px-4 py-3"><span className="font-bold text-indigo-700">{grouped.reduce((sum, row) => sum + row.days[day].hours, 0)}h</span></td>
                      ))}
                      <td className="px-4 py-3 text-center font-bold text-indigo-800 text-base rounded-r-xl">{grandTotalHours}h</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 pb-2 shrink-0">
              <label className="block text-sm font-medium text-gray-600 mb-2">Remark</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Write your remark here..." className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none" rows={3} />
            </div>
            <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0">
              <span className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 self-start sm:self-auto">{selected.status}</span>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg border hover:bg-gray-100 transition text-sm">Cancel</button>
                <button onClick={() => { if (!remark) { alert("Please enter remark"); return; } if (!selected?.id) { alert("No timesheet selected"); return; } remarkMutation.mutate({ timesheetId: selected.id, adminRemarks: remark, entraId: entraId! }); }} disabled={!remark || remarkMutation.isPending} className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 text-sm">
                  {remarkMutation.isPending ? "Saving…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE PAGE ── */}
      {notePage && (
        <div className="fixed inset-0 z-[100] bg-gray-50 overflow-auto">
          <MainLayout>
            <div className="min-h-screen p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <button onClick={() => setNotePage(null)} className="flex items-center justify-center w-9 h-9 rounded-full bg-white border shadow-sm hover:bg-gray-100 transition">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Note Details</h1>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{notePage.project || "No Project"} • {notePage.task}</p>
                </div>
              </div>
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Day</p>
                    <p className="text-base sm:text-lg font-semibold text-gray-800 mt-1">{notePage.day}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Task</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{notePage.task}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
                  <h2 className="text-sm font-semibold text-gray-600 mb-3">Note Description</h2>
                  <div className="bg-gray-50 rounded-xl p-4 border">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm sm:text-base">{notePage.note}</p>
                  </div>
                </div>
              </div>
            </div>
          </MainLayout>
        </div>
      )}
    </MainLayout>
  );
}