import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { addDays, startOfWeek, format, isAfter, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, FileText, X, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react"
import { useAuth } from "../../../features/auth/hooks/useAuth"
import MainLayout from "../../../shared/components/layout/MainLayout"
import {
  fetchTasks,
  // fetchProjects,
  fetchTimesheetEntries,
  fetchTimesheetHistory,
  saveDraftTimesheet,
  submitTimesheet,
} from "../api/timesheetApi"
import { fetchProjectsWithLoggedHours, fetchCurrentUserByEntraId } from "../../projects/api/projectApi";
import type { Project as FullProject } from "../../projects/components/ProjectComponents";
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/* ---------------- TYPES ---------------- */

type TimesheetHistoryItem = {
  id: string
  timesheetId: string
  entryDate: string
  status: string
  submittedAt: string | null
  approvedAt: string | null
  adminRemarks: string | null
}

type Task = { id: string; name: string; projectId: string | null; status?: string; }
// type Project = { id: string; name: string }

type ApiEntry = {
  id: string
  projectId: string | null
  taskId: string | null
  entryDate: string
  hours: number
  note: string
}

type DayEntry = { hours: number; note: string }

type Row = {
  id: string
  project: string
  task: string
  days: DayEntry[]
}

type TimesheetEntryPayload = {
  projectId: string | null
  taskId: string | null
  entryDate: string
  hours: number
  note: string
}

/* ---------------- HELPERS ---------------- */

const createDays = (): DayEntry[] =>
  Array.from({ length: 5 }).map(() => ({ hours: 0, note: "" }))

const fromBackendId = (value: string | null | undefined): string =>
  !value ? "OTHER" : value

const toBackendId = (value: string): string | null =>
  !value || value === "OTHER" ? null : value

// FIX #2: Helper to clamp and round hours to nearest 0.5 within [0, 2.5]
const clampAndRoundHours = (val: number): number => {
  if (isNaN(val)) return 0
  const clamped = Math.min(2.5, Math.max(0, val))
  return Math.round(clamped * 2) / 2
}

/* ---------------- SKELETON ---------------- */

function TimesheetSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-slate-200 rounded-xl" />
          <div className="h-4 w-64 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit gap-1">
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
          <div className="h-9 w-24 bg-slate-100 rounded-lg" />
        </div>
      </div>
      {/* WEEK NAV BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-slate-100 rounded-lg" />
          <div className="h-5 w-44 bg-slate-200 rounded-lg mx-2" />
          <div className="h-9 w-9 bg-slate-100 rounded-lg" />
          <div className="h-5 w-28 bg-violet-100 rounded-full ml-2" />
          <div className="h-9 w-9 bg-slate-100 rounded-lg ml-1" />
          <div className="hidden sm:flex gap-2 ml-auto">
            <div className="h-9 w-28 bg-slate-100 rounded-xl" />
            <div className="h-9 w-24 bg-violet-200 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2 mt-3 sm:hidden">
          <div className="flex-1 h-10 bg-slate-100 rounded-xl" />
          <div className="flex-1 h-10 bg-violet-200 rounded-xl" />
        </div>
      </div>
      {/* DESKTOP TABLE SKELETON */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-[200px_200px_repeat(5,88px)_80px] gap-2 px-3 py-3 items-center">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-3 w-7 bg-slate-200 rounded" />
              <div className="h-5 w-6 bg-slate-300 rounded" />
            </div>
          ))}
          <div className="h-4 w-10 bg-slate-200 rounded mx-auto" />
        </div>
        {[1, 0.75, 0.5].map((opacity, row) => (
          <div key={row} className="grid grid-cols-[200px_200px_repeat(5,88px)_80px] gap-2 px-3 py-3 border-b border-slate-100 items-center" style={{ opacity }}>
            <div className="h-9 bg-slate-100 rounded-lg" />
            <div className="h-9 bg-slate-100 rounded-lg" />
            {[0, 1, 2, 3, 4].map((d) => (
              <div key={d} className="flex items-center justify-center gap-1">
                <div className="h-8 w-14 bg-slate-100 rounded-lg" />
                <div className="h-5 w-4 bg-slate-100 rounded" />
              </div>
            ))}
            <div className="h-7 w-12 bg-slate-100 rounded-lg mx-auto" />
          </div>
        ))}
        <div className="grid grid-cols-[200px_200px_repeat(5,88px)_80px] gap-2 px-3 py-3 bg-slate-50 border-t-2 border-slate-200 items-center">
          <div className="col-span-2 h-4 w-24 bg-slate-200 rounded" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 w-10 bg-slate-200 rounded mx-auto" />
          ))}
          <div className="h-7 w-16 bg-violet-200 rounded-lg mx-auto" />
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-slate-200" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
      </div>
      {/* MOBILE CARD SKELETON */}
      <div className="sm:hidden space-y-3">
        {[1, 0.7, 0.45].map((opacity, card) => (
          <div key={card} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4" style={{ opacity }}>
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div className="h-3 w-6 bg-slate-200 rounded" />
                  <div className="h-3 w-4 bg-slate-100 rounded" />
                  <div className="h-9 w-full bg-slate-100 rounded-lg" />
                  <div className="h-4 w-4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-10 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
        <div className="bg-linear-to-br from-violet-300 to-violet-400 rounded-2xl p-4 shadow-lg">
          <div className="h-3 w-24 bg-violet-200 rounded mb-3" />
          <div className="grid grid-cols-5 gap-1 mb-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-3 w-6 bg-violet-200 rounded" />
                <div className="h-5 w-5 bg-violet-100 rounded" />
              </div>
            ))}
          </div>
          <div className="border-t border-violet-300 pt-3 flex justify-between items-center">
            <div className="h-4 w-20 bg-violet-200 rounded" />
            <div className="h-8 w-10 bg-violet-100 rounded" />
          </div>
        </div>
        <div className="w-full h-12 border-2 border-dashed border-violet-200 rounded-2xl bg-violet-50/30" />
      </div>
    </div>
  )
}

function TableRowSkeleton({ index }: { index: number }) {
  return (
    <tr className="animate-pulse" style={{ opacity: 1 - index * 0.2, animationDelay: `${index * 80}ms` }}>
      <td className="p-2 min-w-45"><div className="h-9 bg-slate-100 rounded-lg shimmer" /></td>
      <td className="p-2 min-w-45"><div className="h-9 bg-slate-100 rounded-lg shimmer" style={{ animationDelay: "60ms" }} /></td>
      {[0, 1, 2, 3, 4].map((d) => (
        <td key={d} className="p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <div className="h-8 w-14 bg-slate-100 rounded-lg shimmer" style={{ animationDelay: `${(d + 2) * 40}ms` }} />
            <div className="h-4 w-4 bg-slate-100 rounded shimmer" />
          </div>
        </td>
      ))}
      <td className="text-center p-2"><div className="h-7 w-12 bg-slate-100 rounded-lg mx-auto shimmer" /></td>
    </tr>
  )
}

function MobileCardSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 animate-pulse" style={{ opacity: 1 - index * 0.25, animationDelay: `${index * 100}ms` }}>
      <div className="h-10 bg-slate-100 rounded-lg shimmer" />
      <div className="h-10 bg-slate-100 rounded-lg shimmer" style={{ animationDelay: "60ms" }} />
      <div className="h-3 w-28 bg-slate-200 rounded shimmer" />
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((d) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <div className="h-3 w-6 bg-slate-200 rounded shimmer" style={{ animationDelay: `${d * 40}ms` }} />
            <div className="h-3 w-4 bg-slate-100 rounded shimmer" />
            <div className="h-9 w-full bg-slate-100 rounded-lg shimmer" style={{ animationDelay: `${d * 50}ms` }} />
            <div className="h-4 w-4 bg-slate-100 rounded shimmer" />
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="h-3 w-16 bg-slate-200 rounded shimmer" />
        <div className="h-6 w-10 bg-slate-100 rounded-full shimmer" />
      </div>
    </div>
  )
}

/* ================================================= */

export default function TimesheetEntryForm() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [searchParams] = useSearchParams()
  const [errors, setErrors] = useState<Record<string, { project?: string; task?: string }>>({})
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const queryClient = useQueryClient()
  const today = new Date()
  const { entraId } = useAuth()

  const [view, setView] = useState<"grid" | "history">(
    searchParams.get("tab") === "history" ? "history" : "grid"
  )
  const [popup, setPopup] = useState<{ rowIndex: number; dayIndex: number } | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [weekRows, setWeekRows] = useState<Record<string, Row[]>>({})

  const weekKey = format(weekStart, "yyyy-MM-dd")

  // FIX #1: useCallback with weekStart dependency, read fresh weekKey inside updater
  const setRows = useCallback((updated: Row[]) => {
    setWeekRows((prev) => {
      const currentWeekKey = format(weekStart, "yyyy-MM-dd");
      return { ...prev, [currentWeekKey]: updated };
    });
  }, [weekStart]);

  const days = useMemo(
    () => Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const changeWeek = (num: number) => {
    const newWeek = addDays(weekStart, num)
    if (num > 0 && newWeek > currentWeekStart) return
    setWeekStart(newWeek)
  }

  const isCurrentWeek = weekStart.getTime() === currentWeekStart.getTime()

  const goToWeek = (dateStr: string) => {
    const date = new Date(dateStr)
    const monday = startOfWeek(date, { weekStartsOn: 1 })
    if (isAfter(monday, currentWeekStart)) return
    setWeekStart(monday)
    setCalendarMonth(monday)
    setView("grid")
    setCalendarOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    if (calendarOpen) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [calendarOpen])

  // FIX #3: Body scroll lock when calendar popup is open
  useEffect(() => {
    if (calendarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [calendarOpen]);

  /* ---------------- QUERIES ---------------- */

// ✅ Add these two queries
const { data: currentUser, isLoading: currentUserLoading } = useQuery({
  queryKey: ["currentUser", entraId],
  queryFn: () => fetchCurrentUserByEntraId(entraId!),
  enabled: !!entraId,
  staleTime: 5 * 60 * 1000,
});

const { data: allProjects = [], isLoading: projectsLoading } = useQuery<FullProject[]>({
  queryKey: ["projectsWithAllocations"],
  queryFn: () => fetchProjectsWithLoggedHours("all", ""),
  enabled: !!currentUser, // wait for currentUser to be available
  staleTime: 5 * 60 * 1000,
});
// Filter projects based on user role and allocations (exactly like ProjectsPage)
const filteredProjects = useMemo(() => {
  if (!currentUser) return [];
  const isAdmin = currentUser.role?.toLowerCase() === "admin";
  if (isAdmin) return allProjects;

  // Employee – only projects where the user is allocated
  return allProjects.filter(project =>
    project.memberAllocations?.some(alloc => alloc.userId === currentUser.id)
  );
}, [allProjects, currentUser]);
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000,
  })

  const { data: entries = [], isLoading: entriesLoading } = useQuery<ApiEntry[]>({
    queryKey: ["timesheetEntries", entraId, weekKey],
    queryFn: () => fetchTimesheetEntries(entraId || ""),
    enabled: !!entraId,
    staleTime: 0,
  })

  const { data: history = [] } = useQuery<TimesheetHistoryItem[]>({
    queryKey: ["timesheetHistory", entraId],
    queryFn: () => fetchTimesheetHistory(entraId || ""),
    enabled: !!entraId,
  })

  /* ---------------- SUBMITTED SET (FIX #4) ---------------- */
  const submittedDates = useMemo(() => {
    const set = new Set<string>()
    history.forEach((h) => {
      if (h.status === "submitted" || h.status === "approved") {
        set.add(format(new Date(h.entryDate), "yyyy-MM-dd"))
      }
    })
    return set
  }, [history])

  /* ---------------- ROWS FROM API ---------------- */
  const rowsFromApi = useMemo<Row[]>(() => {
    const weekEntries = entries.filter((entry) => {
      const entryDate = format(new Date(entry.entryDate), "yyyy-MM-dd")
      return days.some((d) => format(d, "yyyy-MM-dd") === entryDate)
    })

    if (!weekEntries.length)
      return [{ id: crypto.randomUUID(), project: "", task: "", days: createDays() }]

    const grouped = new Map<string, Row>()

    weekEntries.forEach((entry) => {
      const entryDateStr = format(new Date(entry.entryDate), "yyyy-MM-dd")
      const baseKey = `${entry.projectId ?? "null"}__${entry.taskId ?? "null"}`

      let matchedKey: string | null = null
      for (const [key, row] of grouped.entries()) {
        if (!key.startsWith(baseKey)) continue
        const dayIndex = days.findIndex((d) => format(d, "yyyy-MM-dd") === entryDateStr)
        if (dayIndex !== -1 && row.days[dayIndex].hours === 0) {
          matchedKey = key
          break
        }
      }

      if (!matchedKey) {
        matchedKey = `${baseKey}__${crypto.randomUUID()}`
        grouped.set(matchedKey, {
          id: crypto.randomUUID(),
          project: fromBackendId(entry.projectId),
          task: fromBackendId(entry.taskId),
          days: createDays(),
        })
      }

      const row = grouped.get(matchedKey)!
      const dayIndex = days.findIndex((d) => format(d, "yyyy-MM-dd") === entryDateStr)
      if (dayIndex !== -1) {
        row.days[dayIndex] = { hours: entry.hours, note: entry.note }
      }
    })

    return Array.from(grouped.values())
  }, [entries, days])

  const displayRows: Row[] = useMemo(() => {
    if (weekRows[weekKey]) return weekRows[weekKey]
    return rowsFromApi.map((r) => ({ ...r, days: r.days.map((d) => ({ ...d })) }))
  }, [weekRows, weekKey, rowsFromApi])

  /* ---------------- TOTALS ---------------- */
  const rowTotal = (row: Row) => row.days.reduce((a, b) => a + b.hours, 0)
  const dailyTotal = (index: number) =>
    displayRows.reduce((sum, r) => sum + r.days[index].hours, 0)
  const weekTotal = displayRows.reduce((sum, r) => sum + rowTotal(r), 0)

  /* ---------------- MUTATIONS ---------------- */
  const saveDraftMutation = useMutation({
    mutationFn: saveDraftTimesheet,
    onSuccess: async () => {
      toast.success("Draft saved successfully")
      await queryClient.invalidateQueries({ queryKey: ["timesheetEntries", entraId] })
      setWeekRows({})
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save draft")
    },
  })

  const submitMutation = useMutation({
    mutationFn: submitTimesheet,
    onSuccess: async () => {
      toast.success("Timesheet submitted successfully")
      await queryClient.invalidateQueries({ queryKey: ["timesheetEntries", entraId] })
      await queryClient.invalidateQueries({ queryKey: ["timesheetHistory", entraId] })
      setWeekRows({})
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit timesheet")
    },
  })

  const addRow = () =>
    setRows([...displayRows, { id: crypto.randomUUID(), project: "", task: "", days: createDays() }])

  /* ---------------- PAYLOAD ---------------- */
const buildPayload = (status: "draft" | "submitted") => {
  if (!entraId) return null;

  const payload: TimesheetEntryPayload[] = [];
  const newErrors: Record<string, { project?: string; task?: string }> = {};

  /* ===============================
     ✅ VALIDATE ONLY ACTIVE DAY
     =============================== */
  if (status === "submitted" && activeDayIndex !== null) {
    const dayTotal = displayRows.reduce(
      (sum, r) => sum + r.days[activeDayIndex].hours,
      0
    );

    if (dayTotal > 0 && dayTotal < 8) {
      toast.error(
        `${format(days[activeDayIndex], "EEE MMM d")} must be at least 8h. Current: ${dayTotal}h`
      );
      return null;
    }
  }

  /* ===============================
     ✅ ROW VALIDATION + PAYLOAD
     =============================== */
  displayRows.forEach((row) => {
    const hasHours = row.days.some((day) => day.hours > 0);
    if (!hasHours) return;

    const rowError: { project?: string; task?: string } = {};

    if (!row.project) rowError.project = "Project is required";
    if (!row.task) rowError.task = "Task is required";

    if (rowError.project || rowError.task) {
      newErrors[row.id] = rowError;
      return;
    }

    row.days.forEach((day, index) => {
      if (day.hours > 0) {
        payload.push({
          projectId: toBackendId(row.project),
          taskId: toBackendId(row.task),
          entryDate: format(days[index], "yyyy-MM-dd"),
          hours: day.hours,
          note: day.note,
        });
      }
    });
  });

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) return null;
  if (!payload.length) return null;

  return {
    entraId,
    status,
    entries: payload,
  };
};

  const getTasksForRow = (row: Row) => {
    if (!tasks || tasks.length === 0) return []

    let filteredTasks = tasks.filter((t) => t.status !== "Pending")

    filteredTasks = filteredTasks.filter((t) => {
      if (!row.project || row.project === "OTHER") {
        return t.projectId === null || t.projectId === undefined
      }
      return String(t.projectId) === String(row.project)
    })

    if (
      row.task &&
      row.task !== "OTHER" &&
      !filteredTasks.some((t) => t.id === row.task)
    ) {
      const orphanTask = tasks.find((t) => t.id === row.task)
      if (orphanTask) filteredTasks = [orphanTask, ...filteredTasks]
    }

    return filteredTasks
  }
  const handleProjectChange = (rowIndex: number, newProjectId: string) => {
    setRows(
      displayRows.map((r, i) => {
        if (i !== rowIndex) return r
        const taskStillValid =
          !newProjectId ||
          newProjectId === "OTHER" ||
          r.task === "OTHER" ||
          tasks.some(
            (t) =>
              String(t.id) === String(r.task) &&
              String(t.projectId) === String(newProjectId)
          )
        return {
          ...r,
          days: r.days.map((d) => ({ ...d })),
          project: newProjectId,
          task: taskStillValid ? r.task : "",
        }
      })
    )
    setErrors((prev) => {
      const c = { ...prev }
      if (c[displayRows[rowIndex].id]) {
        const updated = { ...c[displayRows[rowIndex].id] }
        delete updated.project
        if (Object.keys(updated).length === 0) delete c[displayRows[rowIndex].id]
        else c[displayRows[rowIndex].id] = updated
      }
      return c
    })
  }

  const handleTaskChange = (rowIndex: number, newTaskId: string) => {
    setRows(
      displayRows.map((r, i) =>
        i !== rowIndex ? r : { ...r, days: r.days.map((d) => ({ ...d })), task: newTaskId }
      )
    )
    setErrors((prev) => {
      const c = { ...prev }
      if (c[displayRows[rowIndex].id]) {
        const updated = { ...c[displayRows[rowIndex].id] }
        delete updated.task
        if (Object.keys(updated).length === 0) delete c[displayRows[rowIndex].id]
        else c[displayRows[rowIndex].id] = updated
      }
      return c
    })
  }

  const statusBadge = (status: string) => {
    if (status === "approved") return "bg-emerald-100 text-emerald-700 border border-emerald-200"
    if (status === "submitted") return "bg-sky-100 text-sky-700 border border-sky-200"
    return "bg-amber-100 text-amber-700 border border-amber-200"
  }

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle size={12} className="text-emerald-600" />
    if (status === "submitted") return <Clock size={12} className="text-sky-600" />
    return <AlertCircle size={12} className="text-amber-600" />
  }

  useEffect(() => {
    if (popup && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [popup]);

  /* ── SKELETON GUARD ── */
  if (tasksLoading || projectsLoading|| currentUserLoading) {
    return (
      <MainLayout>
        <TimesheetSkeleton />
      </MainLayout>
    )
  }

  /* ================================================= */
  return (
    <MainLayout>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 40%, #f1f5f9 80%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .row-enter {
          animation: fadeInRow 0.3s ease-out forwards;
        }
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter {
          animation: fadeInCard 0.35s ease-out forwards;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* HEADER */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              Weekly Timesheet
            </h1>
            <p className="text-slate-400 text-sm mt-1">Log your daily hours by project and task</p>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
            <button
              onClick={() => setView("grid")}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === "grid"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              Week Grid
            </button>
            <button
              onClick={() => setView("history")}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${view === "history"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              My History
            </button>
          </div>
        </div>

        {/* GRID VIEW */}
        {view === "grid" && (
          <>
            {/* Missing submissions warning banner */}
            {(() => {
              const missingDays = days.filter(d => {
                const dateStr = format(d, "yyyy-MM-dd")
                const todayStr = format(today, "yyyy-MM-dd")
                return dateStr < todayStr && !submittedDates.has(dateStr)
              })
              if (missingDays.length === 0) return null
              return (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    <span className="font-semibold">Missing submissions:</span> You have
                    unsubmitted entries for {missingDays.map(d => format(d, "MMM d")).join(", ")}.
                    Please submit these entries.
                  </div>
                </div>
              )
            })()}

            {/* WEEK NAV BAR */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition" onClick={() => changeWeek(-7)}>
                  <ChevronLeft size={18} />
                </button>
                <span className="mx-2 font-semibold text-slate-700 text-sm sm:text-base">
                  {format(weekStart, "MMM d")} – {format(addDays(weekStart, 4), "MMM d, yyyy")}
                </span>
                <button
                  className={`p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition ${isCurrentWeek ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  onClick={() => { if (!isCurrentWeek) changeWeek(7) }}
                >
                  <ChevronRight size={18} />
                </button>
                {isCurrentWeek && (
                  <span className="ml-2 px-2.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full border border-violet-200">
                    Current Week
                  </span>
                )}

                {/* CALENDAR PICKER */}
                <div className="relative ml-1" ref={calendarRef}>
                  <button
                    onClick={() => {
                      setCalendarMonth(weekStart)
                      setCalendarOpen((o) => !o)
                    }}
                    className={`p-2 rounded-lg transition border ${calendarOpen
                        ? "bg-violet-100 border-violet-300 text-violet-700"
                        : "border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      }`}
                    title="Jump to date"
                  >
                    <Calendar size={17} />
                  </button>

                  {calendarOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCalendarOpen(false)} />
                      <div className="relative z-10 w-full sm:w-72 h-[85vh] sm:h-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 p-4 animate-slideUp">
                        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
                        <div className="flex items-center justify-between mb-3">
                          <button onClick={() => setCalendarMonth((m) => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-slate-100">
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-base font-bold text-slate-700">{format(calendarMonth, "MMMM yyyy")}</span>
                          <button
                            onClick={() => {
                              const next = addMonths(calendarMonth, 1)
                              if (!isAfter(startOfMonth(next), startOfMonth(currentWeekStart))) setCalendarMonth(next)
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-5 mb-2">
                          {["Mo", "Tu", "We", "Th", "Fr"].map((d) => (
                            <div key={d} className="text-center text-xs font-semibold text-slate-400">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-5 gap-1 flex-1 overflow-y-auto">
                          {(() => {
                            const monthStart = startOfMonth(calendarMonth)
                            const monthEnd = endOfMonth(calendarMonth)
                            const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
                            const weekdays = allDays.filter((d) => {
                              const dow = getDay(d)
                              return dow !== 0 && dow !== 6
                            })
                            const firstWeekday = weekdays[0]
                            const firstWeekdayDow = (getDay(firstWeekday) + 6) % 7
                            const paddedDays = [...Array(firstWeekdayDow).fill(null), ...weekdays]
                            while (paddedDays.length % 5 !== 0) paddedDays.push(null)
                            return paddedDays.map((day, idx) => {
                              if (!day) return <div key={idx} />
                              const dayStr = format(day, "yyyy-MM-dd")
                              const weekMonday = startOfWeek(day, { weekStartsOn: 1 })
                              const isFuture = isAfter(weekMonday, currentWeekStart)
                              const isInSelectedWeek = days.some((d) => format(d, "yyyy-MM-dd") === dayStr)
                              const isTodayDay = isSameDay(day, today)
                              const todayStr = format(today, "yyyy-MM-dd")
                              const isPastStrict = dayStr < todayStr
                              const missingSubmission = isPastStrict && !submittedDates.has(dayStr)
                              return (
                                <button
                                  key={idx}
                                  disabled={isFuture}
                                  onClick={() => goToWeek(dayStr)}
                                  className={`h-10 rounded-xl text-sm font-semibold transition relative ${isInSelectedWeek
                                      ? "bg-violet-600 text-white"
                                      : missingSubmission
                                        ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                                        : "text-slate-700 hover:bg-violet-50"
                                    } ${isTodayDay && !isInSelectedWeek ? "ring-2 ring-violet-300" : ""} ${isFuture ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  {format(day, "d")}
                                  {missingSubmission && !isInSelectedWeek && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                  )}
                                </button>
                              )
                            })
                          })()}
                        </div>
                        <div className="mt-4 pt-3 border-t flex justify-between items-center">
                          <button onClick={() => goToWeek(format(today, "yyyy-MM-dd"))} className="text-sm font-semibold text-violet-600">Today</button>
                          <button onClick={() => setCalendarOpen(false)} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm">Done</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex gap-2 ml-auto">
                  <button
                    onClick={() => { const d = buildPayload("draft"); if (d) saveDraftMutation.mutate(d) }}
                    disabled={saveDraftMutation.isPending || entriesLoading}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
                  >
                    {saveDraftMutation.isPending ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    onClick={() => { const d = buildPayload("submitted"); if (d) submitMutation.mutate(d) }}
                    disabled={submitMutation.isPending || entriesLoading}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition shadow-sm disabled:opacity-50"
                  >
                    {submitMutation.isPending ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-3 sm:hidden">
                <button onClick={() => { const d = buildPayload("draft"); if (d) saveDraftMutation.mutate(d) }} disabled={entriesLoading} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Save Draft</button>
                <button onClick={() => { const d = buildPayload("submitted"); if (d) submitMutation.mutate(d) }} disabled={entriesLoading} className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50">Submit</button>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-visible max-h-[65vh] scroll-smooth">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project <span className="text-red-400">*</span></th>
                      <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task <span className="text-red-400">*</span></th>
                      {days.map((d, i) => (
                        <th key={i} className={`p-3 text-center text-xs font-semibold uppercase tracking-wider ${isAfter(d, today) ? "text-slate-300" : "text-slate-500"}`}>
                          <div>{format(d, "EEE")}</div>
                          <div className={`text-base font-bold mt-0.5 ${format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? "text-violet-600" : isAfter(d, today) ? "text-slate-300" : "text-slate-700"}`}>
                            {format(d, "d")}
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entriesLoading ? (
                      <>
                        <TableRowSkeleton index={0} />
                        <TableRowSkeleton index={1} />
                        <TableRowSkeleton index={2} />
                        <tr className="bg-slate-50 border-t-2 border-slate-200 animate-pulse">
                          <td colSpan={2} className="p-3"><div className="h-4 w-24 bg-slate-200 rounded shimmer" /></td>
                          {[0, 1, 2, 3, 4].map((i) => (
                            <td key={i} className="text-center py-3"><div className="h-5 w-10 bg-slate-200 rounded mx-auto shimmer" style={{ animationDelay: `${i * 40}ms` }} /></td>
                          ))}
                          <td className="text-center py-3"><div className="h-7 w-16 bg-violet-200 rounded-lg mx-auto shimmer" /></td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {displayRows.map((row, rowIndex) => {
                          const rowTasks = getTasksForRow(row)
                          const rowErr = errors[row.id]
                          return (
                            <tr key={row.id} className={`transition-colors row-enter ${rowErr ? "bg-red-50/60" : "hover:bg-slate-50/50"}`} style={{ animationDelay: `${rowIndex * 40}ms` }}>
                              <td className="p-2 min-w-45">
                                <Select value={row.project} onValueChange={(value) => handleProjectChange(rowIndex, value)}>
                                  <SelectTrigger className={`w-full h-9 px-3 rounded-lg border text-sm shadow-none transition ${rowErr?.project ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-slate-200 bg-white hover:border-slate-300 focus:ring-violet-200 focus:border-violet-400"}`}>
                                    <SelectValue placeholder="Select project" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl shadow-lg border border-slate-100 bg-white">
                                    {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id} className="text-sm cursor-pointer">{p.name}</SelectItem>)}
                                    <SelectItem value="OTHER" className="text-sm text-slate-400 cursor-pointer">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                {rowErr?.project && <p className="text-xs text-red-500 mt-1 pl-1">{rowErr.project}</p>}
                              </td>
                              <td className="p-2 min-w-45">
                                <Select value={row.task || ""} onValueChange={(value) => handleTaskChange(rowIndex, value)}>
                                  <SelectTrigger className={`w-full h-9 px-3 rounded-lg border text-sm shadow-none transition ${rowErr?.task ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300 focus:ring-violet-200 focus:border-violet-400"}`}>
                                    <SelectValue placeholder="Select task" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl shadow-lg border border-slate-100 bg-white max-h-60 overflow-y-auto">
                                    {row.task && row.task !== "OTHER" && !rowTasks.some((t) => t.id === row.task) && (
                                      <SelectItem value={row.task}>{tasks.find((t) => t.id === row.task)?.name ?? `Task (${row.task.slice(0, 8)}…)`}</SelectItem>
                                    )}
                                    {rowTasks.map((t) => <SelectItem key={t.id} value={t.id} className="text-sm cursor-pointer">{t.name}</SelectItem>)}
                                    <SelectItem value="OTHER" className="text-sm text-slate-400 cursor-pointer">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                {rowErr?.task && <p className="text-xs text-red-500 mt-1 pl-1">{rowErr.task}</p>}
                              </td>
                              {row.days.map((day, dayIndex) => {
                                const dateStr = format(days[dayIndex], "yyyy-MM-dd")
                                const isToday = dateStr === format(today, "yyyy-MM-dd")
                                const todayStr = format(today, "yyyy-MM-dd")
                                const isPastStrict = dateStr < todayStr
                                const disabled = isAfter(days[dayIndex], today) || submittedDates.has(dateStr)
                                const missingSubmission = !disabled && isPastStrict && !submittedDates.has(dateStr)
                                return (
                                  <td key={dayIndex} className={`p-2 text-center ${missingSubmission ? "bg-red-50/80 border-l-2 border-red-300" : disabled ? "bg-slate-50/80" : isToday ? "bg-violet-50/40" : ""}`}>
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        max={2.5}
                                        step={0.5}
                                        value={day.hours}
                                        disabled={disabled}
                                        className={`w-14 border rounded-lg text-center text-sm py-1.5 outline-none transition
                                          ${disabled ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                                            : missingSubmission ? "border-red-300 focus:border-red-400 focus:ring-red-100 hover:border-red-400"
                                              : "border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 hover:border-slate-300"}
                                          ${day.hours > 0 && !disabled ? "font-semibold text-violet-700 border-violet-300 bg-violet-50" : ""}
                                        `}
                                        onFocus={() => setActiveDayIndex(dayIndex)}
                                        onChange={(e) => {
                                          
                                          const raw = parseFloat(e.target.value);
                                          if (raw > 2.5) {
                                            toast.error(" Max allowed is 2.5 hours in Task");
                                          }
                                          const safeValue = clampAndRoundHours(raw);
                                          
                                            setActiveDayIndex(dayIndex);
                                          setRows(
                                            displayRows.map((r, ri) => {
                                              if (ri !== rowIndex) return r;
                                              const dr = { ...r, days: r.days.map((d) => ({ ...d })) };
                                              dr.days[dayIndex].hours = safeValue;
                                              return dr;
                                            })
                                          );
                                        }}
                                      />
                                      <button
                                        disabled={disabled}
                                        onClick={() => { if (!disabled) setPopup({ rowIndex, dayIndex }) }}
                                        className={`p-1 rounded transition ${disabled ? "text-slate-200 cursor-not-allowed"
                                            : day.note ? (missingSubmission ? "text-red-600 hover:text-red-800" : "text-violet-500 hover:text-violet-700")
                                              : missingSubmission ? "text-red-400 hover:text-red-600" : "text-slate-300 hover:text-slate-500"
                                          }`}
                                      >
                                        <FileText size={14} />
                                      </button>
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="text-center">
                                <span className={`font-bold text-sm px-2 py-1 rounded-lg ${rowTotal(row) > 0 ? "text-violet-700 bg-violet-50" : "text-slate-300"}`}>
                                  {rowTotal(row)}h
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td colSpan={2} className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Total</td>
                          {days.map((_, i) => (
                            <td key={i} className="text-center py-3">
                              <span className={`font-bold text-sm ${dailyTotal(i) > 0 ? "text-slate-700" : "text-slate-300"}`}>{dailyTotal(i)}h</span>
                            </td>
                          ))}
                          <td className="text-center py-3">
                            <span className="font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-lg text-sm">{weekTotal}h</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-100">
                <button onClick={addRow} disabled={entriesLoading} className="flex items-center gap-2 text-sm text-violet-600 font-medium hover:text-violet-800 transition group disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-violet-300 group-hover:border-violet-600 transition"><Plus size={13} /></span> Add Row
                </button>
              </div>
            </div>

            {/* MOBILE CARD LAYOUT */}
            <div className="sm:hidden space-y-3">
              {entriesLoading ? (
                <>
                  <MobileCardSkeleton index={0} />
                  <MobileCardSkeleton index={1} />
                  <MobileCardSkeleton index={2} />
                  <div className="bg-linear-to-br from-violet-300 to-violet-400 rounded-2xl p-4 shadow-lg animate-pulse">
                    <div className="h-3 w-24 bg-violet-200 rounded mb-3 shimmer" />
                    <div className="grid grid-cols-5 gap-1 mb-3">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="h-3 w-6 bg-violet-200 rounded shimmer" style={{ animationDelay: `${i * 40}ms` }} />
                          <div className="h-5 w-5 bg-violet-100 rounded shimmer" />
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-violet-300 pt-3 flex justify-between items-center">
                      <div className="h-4 w-20 bg-violet-200 rounded shimmer" />
                      <div className="h-8 w-10 bg-violet-100 rounded shimmer" />
                    </div>
                  </div>
                  <div className="w-full h-12 border-2 border-dashed border-violet-200 rounded-2xl bg-violet-50/30 animate-pulse" />
                </>
              ) : (
                <>
                  {displayRows.map((row, rowIndex) => {
                    const rowTasks = getTasksForRow(row)
                    const rowErr = errors[row.id]
                    return (
                      <div key={row.id} className={`bg-white border rounded-2xl shadow-sm p-4 card-enter ${rowErr ? "border-red-300 bg-red-50/30" : "border-slate-200"}`} style={{ animationDelay: `${rowIndex * 50}ms` }}>
                        <div className="w-full p-2">
                          <Select value={row.project || ""} onValueChange={(value) => handleProjectChange(rowIndex, value)}>
                            <SelectTrigger className={`w-full h-10 px-3 rounded-lg border bg-white text-sm text-gray-700 shadow-sm transition ${rowErr?.project ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:ring-2 focus:ring-purple-500"}`}>
                              <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border bg-white p-1 max-h-60 overflow-y-auto">
                              {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {rowErr?.project && <p className="text-xs text-red-500 mt-1">{rowErr.project}</p>}
                        </div>
                        <div className="w-full p-2">
                          <Select value={row.task || ""} onValueChange={(value) => handleTaskChange(rowIndex, value)}>
                            <SelectTrigger className={`w-full h-10 px-3 rounded-lg border bg-white text-sm text-gray-700 shadow-sm transition ${rowErr?.task ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:ring-2 focus:ring-purple-500"}`}>
                              <SelectValue placeholder="Select Task" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border bg-white p-1 max-h-60 overflow-y-auto">
                              {row.task && row.task !== "OTHER" && !rowTasks.some((t) => t.id === row.task) && (
                                <SelectItem value={row.task}>{tasks.find((t) => t.id === row.task)?.name ?? `Task (${row.task.slice(0, 8)}...)`}</SelectItem>
                              )}
                              {rowTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {rowErr?.task && <p className="text-xs text-red-500 mt-1">{rowErr.task}</p>}
                        </div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hours per Day</label>
                        <div className="grid grid-cols-5 gap-2">
                          {row.days.map((day, dayIndex) => {
                            const dateStr = format(days[dayIndex], "yyyy-MM-dd")
                            const isToday = dateStr === format(today, "yyyy-MM-dd")
                            const isPast = isAfter(today, days[dayIndex])
                            const disabled = isAfter(days[dayIndex], today) || submittedDates.has(dateStr)
                            const missingSubmission = !disabled && isPast && !submittedDates.has(dateStr)
                            return (
                              <div key={dayIndex} className={`flex flex-col items-center gap-1 p-1 rounded-lg ${missingSubmission ? "bg-red-50/50" : ""}`}>
                                <span className={`text-xs font-semibold ${missingSubmission ? "text-red-600" : isToday ? "text-violet-600" : "text-slate-400"}`}>{format(days[dayIndex], "EEE")}</span>
                                <span className={`text-xs leading-none ${missingSubmission ? "text-red-500 font-bold" : isToday ? "text-violet-500 font-bold" : "text-slate-300"}`}>{format(days[dayIndex], "d")}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={2.5}
                                  step={0.5}
                                  value={day.hours}
                                  disabled={disabled}
                                  className={`w-full border rounded-lg text-center text-sm py-1.5 outline-none transition
                                    ${disabled ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                                      : missingSubmission ? "border-red-300 focus:border-red-400 focus:ring-red-100 text-red-700"
                                        : "border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"}
                                    ${day.hours > 0 && !disabled ? "font-bold" : ""}
                                  `}
                                  onChange={(e) => {
                                    const raw = parseFloat(e.target.value);
                                    const safeValue = clampAndRoundHours(raw);
                                    setRows(
                                      displayRows.map((r, ri) => {
                                        if (ri !== rowIndex) return r;
                                        const dr = { ...r, days: r.days.map((d) => ({ ...d })) };
                                        dr.days[dayIndex].hours = safeValue;
                                        return dr;
                                      })
                                    );
                                  }}
                                />
                                <button
                                  disabled={disabled}
                                  onClick={() => { if (!disabled) setPopup({ rowIndex, dayIndex }) }}
                                  className={`transition ${disabled ? "text-slate-200 cursor-not-allowed" : missingSubmission ? (day.note ? "text-red-600" : "text-red-400") : day.note ? "text-violet-500" : "text-slate-300 hover:text-violet-500"}`}
                                >
                                  <FileText size={13} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Row Total</span>
                          <span className={`font-bold text-sm px-3 py-0.5 rounded-full ${rowTotal(row) > 0 ? "text-violet-700 bg-violet-100" : "text-slate-300"}`}>{rowTotal(row)}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="bg-linear-to-br from-violet-600 to-violet-700 rounded-2xl p-4 text-white shadow-lg card-enter" style={{ animationDelay: `${displayRows.length * 50}ms` }}>
                    <p className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-3">Daily Totals</p>
                    <div className="grid grid-cols-5 gap-1 text-center mb-3">
                      {days.map((d, i) => (
                        <div key={i}>
                          <div className="text-xs text-violet-300">{format(d, "EEE")}</div>
                          <div className="font-bold text-white text-base">{dailyTotal(i)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-violet-500 pt-3 flex justify-between items-center">
                      <span className="text-sm font-medium text-violet-200">Week Total</span>
                      <span className="text-2xl font-bold text-white">{weekTotal}</span>
                    </div>
                  </div>
                  <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-violet-200 rounded-2xl text-sm text-violet-600 font-semibold hover:bg-violet-50 hover:border-violet-400 transition">
                    <Plus size={16} /> Add Row
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <>
            {/* Desktop History Table */}
            <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Date", "Status", "Submitted", "Approved", "Remarks"].map((h) => (
                      <th key={h} className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <Clock size={32} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No timesheet history found.</p>
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="hover:bg-violet-50/40 cursor-pointer transition-colors group" onClick={() => goToWeek(item.entryDate)} title={`Go to week of ${format(new Date(item.entryDate), "MMM d, yyyy")}`}>
                        <td className="p-3">
                          <div className="font-semibold text-slate-700 group-hover:text-violet-700 transition-colors">{format(new Date(item.entryDate), "EEE, MMM d")}</div>
                          <div className="text-xs text-slate-400">{format(new Date(item.entryDate), "yyyy")}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold ${statusBadge(item.status)}`}>
                            {statusIcon(item.status)} {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-xs">{item.submittedAt ? format(new Date(item.submittedAt), "MMM d, yyyy HH:mm") : <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 text-slate-500 text-xs">{item.approvedAt ? format(new Date(item.approvedAt), "MMM d, yyyy HH:mm") : <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 text-slate-500 text-xs max-w-50 truncate">{item.adminRemarks || <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile History Cards */}
            <div className="sm:hidden space-y-3">
              {history.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center gap-2">
                  <Clock size={36} className="text-slate-200" />
                  <p className="text-slate-400 text-sm font-medium">No timesheet history found.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:border-violet-300 hover:shadow-md transition-all active:scale-[0.99]"
                    onClick={() => goToWeek(item.entryDate)}
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {format(new Date(item.entryDate), "EEEE")}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {format(new Date(item.entryDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`inline-flex items-center gap-1 text-xs rounded-full font-semibold px-2.5 py-1 ${statusBadge(item.status)}`}>
                          {statusIcon(item.status)}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                        <ChevronRight size={14} className="text-violet-400" />
                      </div>
                    </div>

                    <div className="px-4 py-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-20 shrink-0">
                          Submitted
                        </span>
                        <span className="text-slate-600 text-xs">
                          {item.submittedAt
                            ? format(new Date(item.submittedAt), "MMM dd, yyyy HH:mm")
                            : <span className="text-slate-300">—</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-20 shrink-0">
                          Approved
                        </span>
                        <span className="text-slate-600 text-xs">
                          {item.approvedAt
                            ? format(new Date(item.approvedAt), "MMM dd, yyyy HH:mm")
                            : <span className="text-slate-300">—</span>}
                        </span>
                      </div>

                      {item.adminRemarks ? (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Admin Remarks</p>
                          <p className="text-xs text-slate-600 leading-relaxed wrap-break-words">
                            {item.adminRemarks}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-20 shrink-0">
                            Remarks
                          </span>
                          <span className="text-slate-300 text-xs">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* NOTE POPUP (shared) */}
        {popup && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-96 border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-800">Add Note</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(days[popup.dayIndex], "EEEE, MMM d")}
                  </p>
                </div>
                <button
                  onClick={() => setPopup(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                ref={textareaRef}
                rows={4}
                placeholder="What did you work on?"
                className="border border-slate-200 w-full p-3 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none text-sm resize-none transition placeholder-slate-300"
                value={displayRows[popup.rowIndex].days[popup.dayIndex].note}
                onChange={(e) => {
                  setRows(
                    displayRows.map((r, ri) => {
                      if (ri !== popup.rowIndex) return r
                      const dr = { ...r, days: r.days.map((d) => ({ ...d })) }
                      dr.days[popup.dayIndex].note = e.target.value
                      return dr
                    })
                  )
                }}
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setPopup(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setPopup(null)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}