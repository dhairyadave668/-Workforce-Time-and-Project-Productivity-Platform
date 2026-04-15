import { useReducer, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  ListTodo,
  Layers,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTasks, deleteTask, updateTaskStatus } from "../api/tasksApi";
import type { ApiTask } from "../types/taskTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import TaskForm from "./TaskForm";
import type { Task } from "./TaskForm";
import * as projectApi from "../../projects/api/projectApi";
import type { Project } from "../../projects/components/ProjectComponents";
import MainLayout from "../../../shared/components/layout/MainLayout";
import { useAuth } from "../../../features/auth/hooks/useAuth";

const TASKS_PER_PAGE = 10;

type PageState = {
  currentPage: number;
  searchQuery: string;
  selectedProject: string;
  statusFilter: string;
};

type PageAction =
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_PROJECT"; payload: string }
  | { type: "SET_STATUS_FILTER"; payload: string }
  | { type: "CLEAR_FILTERS" };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case "SET_SELECTED_PROJECT":
      return { ...state, selectedProject: action.payload, currentPage: 1 };
    case "SET_STATUS_FILTER":
      return { ...state, statusFilter: action.payload, currentPage: 1 };
    case "CLEAR_FILTERS":
      return { ...state, searchQuery: "", selectedProject: "all", statusFilter: "all", currentPage: 1 };
    default:
      return state;
  }
};

/* ── Skeleton Components ── */
function SkeletonCell({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />;
}

function TasksSkeletonLoader({ isAdmin }: { isAdmin: boolean }) {
  return (
    <MainLayout>
      <div className="h-full flex flex-col px-4 sm:px-6 lg:px-8 py-4 gap-3">
        <div className="flex items-center justify-between">
          <SkeletonCell className="h-4 w-52" />
          {isAdmin && <SkeletonCell className="h-8 w-24 rounded-xl" />}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <SkeletonCell className="h-9 sm:h-8 flex-1 sm:max-w-60 rounded-lg" />
          {isAdmin && <SkeletonCell className="h-9 sm:h-8 w-full sm:w-52 rounded-lg" />}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border px-3 py-1.5 bg-gray-50 border-gray-100">
              <SkeletonCell className="w-3.5 h-3.5 rounded-full shrink-0" />
              <div className="flex flex-col gap-1">
                <SkeletonCell className="h-2.5 w-14" />
                <SkeletonCell className="h-4 w-6" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="max-h-100 overflow-auto">
            <div className="min-w-175">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    {["Task", "Project", "Priority", "Status", "Hours", ...(isAdmin ? ["Action"] : [])].map((col) => (
                      <th key={col} className={`px-4 py-2.5 ${col === "Action" ? "text-center" : "text-left"}`}>
                        <SkeletonCell className="h-3 w-14" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Array.from({ length: 8 }).map((_, rowIdx) => (
                    <tr key={rowIdx} className="animate-pulse">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <SkeletonCell className="w-7 h-7 rounded-full shrink-0" />
                          <SkeletonCell className="h-3.5 w-28" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><SkeletonCell className="h-3.5 w-24" /></td>
                      <td className="px-4 py-2.5"><SkeletonCell className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-2.5"><SkeletonCell className="h-6 w-28 rounded-full" /></td>
                      <td className="px-4 py-2.5"><SkeletonCell className="h-3.5 w-8" /></td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <SkeletonCell className="w-6 h-6 rounded-lg" />
                            <SkeletonCell className="w-6 h-6 rounded-lg" />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-lg px-3 py-2 shadow-sm">
          <div className="hidden sm:flex items-center justify-between gap-3">
            <SkeletonCell className="h-3 w-36" />
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCell key={i} className="h-6 w-9 rounded-md" />
              ))}
            </div>
          </div>
          <div className="flex sm:hidden justify-center">
            <SkeletonCell className="h-3 w-36" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Mobile Task Card Component
function MobileTaskCard({ 
  task, 
  isAdmin, 
  onEdit, 
  onDelete, 
  onStatusChange,
  projectName 
}: { 
  task: ApiTask;
  isAdmin: boolean;
  onEdit: (task: ApiTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ApiTask["status"]) => void;
  projectName?: string;
}) {
  const [showActions, setShowActions] = useState(false);

  const priorityColor = (priority: ApiTask["priority"]) => {
    switch (priority) {
      case "High": return "bg-red-50 text-red-600 border-red-100";
      case "Medium": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Low": return "bg-green-50 text-green-600 border-green-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  const statusColor = (status: ApiTask["status"]) => {
    switch (status) {
      case "Completed": return "bg-green-50 text-green-700 border-green-100";
      case "In Progress": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 active:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-linear-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0">
            {task.name[0]?.toUpperCase() || "T"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {task.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock size={12} />
                <span>{task.task_Hours}h</span>
              </div>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${priorityColor(task.priority)}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {task.priority}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
        <Layers size={14} className="text-gray-400 shrink-0" />
        <span className="text-sm font-medium truncate">{projectName || "Other"}</span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Select
          value={task.status}
          onValueChange={(value) => onStatusChange(task.id, value as ApiTask["status"])}
        >
          <SelectTrigger
            className={`flex-1 h-9 px-3 rounded-lg text-sm font-medium border shadow-none focus:ring-0 focus:ring-offset-0 ${statusColor(task.status)}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border bg-white p-1">
            <SelectItem value="Pending" className="text-sm cursor-pointer py-2">
              Pending
            </SelectItem>
            <SelectItem value="In Progress" className="text-sm cursor-pointer py-2">
              In Progress
            </SelectItem>
            <SelectItem value="Completed" className="text-sm cursor-pointer py-2">
              Completed
            </SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border rounded-xl shadow-xl z-20 min-w-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      onEdit(task);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Pencil size={14} />
                    Edit Task
                  </button>
                  <button
                    onClick={() => {
                      onDelete(task.id);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t"
                  >
                    <Trash2 size={14} />
                    Delete Task
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { userRole, entraId } = useAuth();
  const normalizedRole = userRole?.toLowerCase().trim();
  const isAdmin = normalizedRole === "admin";

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [pageState, dispatch] = useReducer(pageReducer, {
    currentPage: 1,
    searchQuery: "",
    selectedProject: "all",
    statusFilter: "all",
  });

  const { currentPage, searchQuery, selectedProject, statusFilter } = pageState;

  const [form, setForm] = useState<Task>({
    name: "",
    projectId: "",
    priority: "Medium",
    status: "Pending",
    task_Hours: "",
  });

  // ✅ Projects are only needed for admin (project filter & form)
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["projectsWithLoggedHours"],
    queryFn: () => projectApi.fetchProjectsWithLoggedHours(),
    enabled: isAdmin,
  });

  // ✅ Tasks are always fetched (employees can see them)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<ApiTask[]>({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const isLoading = (isAdmin && projectsLoading) || tasksLoading;

  // Delete mutation (admin only) – merged version
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!entraId) throw new Error("Authentication required");
      return deleteTask({ id, entraId });
    },
    onMutate: () => toast.loading("Deleting task..."),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
      queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
      toast.dismiss();
      toast.success("Task deleted successfully");
      const currentFiltered = tasks.filter((task) => {
        if (selectedProject !== "all" && task.projectId !== selectedProject) return false;
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (searchQuery.trim() && !task.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
        return true;
      });
      const newTotal = Math.ceil((currentFiltered.length - 1) / TASKS_PER_PAGE);
      if (currentPage > newTotal) {
        dispatch({ type: "SET_PAGE", payload: Math.max(1, newTotal) });
      }
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message === "Authentication required" ? "Please log in again" : "Failed to delete task ❌");
    },
  });

  // Status mutation (both admin & employee) – merged version
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApiTask["status"] }) => {
      if (!entraId) throw new Error("Authentication required");
      return updateTaskStatus({ id, status, entraId });
    },
    onMutate: async ({ id, status }) => {
      toast.loading("Updating status...");
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const prevTasks = queryClient.getQueryData<ApiTask[]>(["tasks"]);
      queryClient.setQueryData<ApiTask[]>(["tasks"], (old = []) =>
        old.map((task) => (task.id === id ? { ...task, status } : task))
      );
      return { prevTasks };
    },
    onSuccess: (_data, variables) => {
      toast.dismiss();
      toast.success("Status updated successfully");
      // Find the task to get its projectId (from other branch)
      const task = tasks.find(t => t.id === variables.id);
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["projectBreakdown", task.projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error, _vars, context) => {
      toast.dismiss();
      toast.error(error.message === "Authentication required" ? "Please log in again" : "Failed to update status ❌");
      if (context?.prevTasks) {
        queryClient.setQueryData(["tasks"], context.prevTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateStatus = (id: string, status: ApiTask["status"]) =>
    statusMutation.mutate({ id, status });

  if (isLoading) {
    return <TasksSkeletonLoader isAdmin={isAdmin} />;
  }

  // Filter & pagination logic
  const filteredTasks = (() => {
    let filtered = [...tasks];
    if (selectedProject !== "all" && isAdmin) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((task) =>
        task.name.toLowerCase().includes(query)
      );
    }
    return filtered;
  })();

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const timeA = new Date(a.created_On || 0).getTime();
    const timeB = new Date(b.created_On || 0).getTime();
    return timeB - timeA;
  });

  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;

  const totalPages = Math.ceil(sortedTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = (() => {
    const start = (currentPage - 1) * TASKS_PER_PAGE;
    return sortedTasks.slice(start, start + TASKS_PER_PAGE);
  })();

  const editTask = (task: ApiTask) => {
    if (!isAdmin) return;
    const converted: Task = {
      id: task.id,
      name: task.name,
      projectId: task.projectId ?? "",
      priority: task.priority,
      status: task.status,
      task_Hours: task.task_Hours.toString(),
    };
    setEditingTask(converted);
    setForm(converted);
    setShowForm(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value });
  };

  const handleProjectChange = (value: string) => {
    dispatch({ type: "SET_SELECTED_PROJECT", payload: value });
  };

  const handleStatusFilter = (status: string) => {
    dispatch({ type: "SET_STATUS_FILTER", payload: status });
  };

  const clearFilters = () => dispatch({ type: "CLEAR_FILTERS" });
  const clearSearch = () => dispatch({ type: "SET_SEARCH_QUERY", payload: "" });

  const hasActiveFilters = searchQuery !== "" || (isAdmin && selectedProject !== "all") || statusFilter !== "all";

  const priorityColor = (priority: ApiTask["priority"]) => {
    switch (priority) {
      case "High": return "bg-red-50 text-red-600 border-red-100";
      case "Medium": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Low": return "bg-green-50 text-green-600 border-green-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  const statusColor = (status: ApiTask["status"]) => {
    switch (status) {
      case "Completed": return "bg-green-50 text-green-700 border-green-100";
      case "In Progress": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  const getStatusFilterName = () => {
    switch (statusFilter) {
      case "Completed": return "Completed";
      case "In Progress": return "In Progress";
      case "Pending": return "Pending";
      default: return "";
    }
  };

  return (
    <MainLayout>
      <div className="h-full flex flex-col px-4 sm:px-6 lg:px-8 py-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">
              Manage and track all task definitions
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingTask(null);
                setForm({ name: "", projectId: "", priority: "Medium", status: "Pending", task_Hours: "" });
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-medium shadow-sm"
            >
              <Plus size={15} />
              Add Task
            </button>
          )}
        </div>

        {/* Search + Filter (filter only for admin) */}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1 sm:max-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-8 pr-7 py-2 sm:py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600 transition" />
              </button>
            )}
          </div>
          
          {/* Project filter – admin only */}
          {isAdmin && (
            <div className="sm:w-52">
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-full border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 text-sm h-auto sm:h-8">
                  <div className="flex items-center gap-1.5">
                    <Filter size={12} className="text-gray-400 shrink-0" />
                    <SelectValue placeholder="All Projects" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-xl border bg-white p-1">
                  <SelectItem value="all" className="cursor-pointer text-sm rounded-md py-2 sm:py-1.5">
                    All Projects
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="cursor-pointer text-sm rounded-md py-2 sm:py-1.5">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-2 sm:py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1 whitespace-nowrap h-auto sm:h-8"
            >
              <X size={12} />
              <span className="hidden xs:inline text-xs">Clear</span>
            </button>
          )}
        </div>

        {/* Active filter chips - mobile only */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 sm:hidden">
            {searchQuery && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs">
                <span className="max-w-36 truncate">{searchQuery}</span>
                <button onClick={clearSearch} className="ml-0.5 p-0.5"><X size={10} /></button>
              </div>
            )}
            {isAdmin && selectedProject !== "all" && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs">
                <span>{projects.find((p) => p.id === selectedProject)?.name}</span>
                <button onClick={() => handleProjectChange("all")} className="ml-0.5 p-0.5"><X size={10} /></button>
              </div>
            )}
            {statusFilter !== "all" && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs">
                <span>{getStatusFilterName()}</span>
                <button onClick={() => handleStatusFilter("all")} className="ml-0.5 p-0.5"><X size={10} /></button>
              </div>
            )}
            <button onClick={clearFilters} className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs">
              Clear all
            </button>
          </div>
        )}

        {/* Stats - Clickable to filter by status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:sticky sm:top-0 sm:z-20 sm:pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {[
            {
              label: "Completed",
              value: completedCount,
              color: "text-green-600",
              bg: statusFilter === "Completed" ? "bg-green-100 border-green-300 ring-2 ring-green-400 ring-offset-1" : "bg-green-50 border-green-100",
              hover: "hover:bg-green-100 hover:border-green-200",
              icon: <CheckCircle2 size={16} className="text-green-500" />,
              statusValue: "Completed",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              color: "text-blue-600",
              bg: statusFilter === "In Progress" ? "bg-blue-100 border-blue-300 ring-2 ring-blue-400 ring-offset-1" : "bg-blue-50 border-blue-100",
              hover: "hover:bg-blue-100 hover:border-blue-200",
              icon: <Clock size={16} className="text-blue-500" />,
              statusValue: "In Progress",
            },
            {
              label: "Pending",
              value: pendingCount,
              color: "text-amber-600",
              bg: statusFilter === "Pending" ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400 ring-offset-1" : "bg-amber-50 border-amber-100",
              hover: "hover:bg-amber-100 hover:border-amber-200",
              icon: <Clock size={16} className="text-amber-500" />,
              statusValue: "Pending",
            },
            {
              label: "Total",
              value: tasks.length,
              color: "text-indigo-600",
              bg: statusFilter === "all" ? "bg-indigo-100 border-indigo-300 ring-2 ring-indigo-400 ring-offset-1" : "bg-indigo-50 border-indigo-100",
              hover: "hover:bg-indigo-100 hover:border-indigo-200",
              icon: <ListTodo size={16} className="text-indigo-500" />,
              statusValue: "all",
            },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => handleStatusFilter(s.statusValue)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 cursor-pointer ${s.bg} ${s.hover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <div className="shrink-0">{s.icon}</div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden hidden sm:block flex-1 min-h-0">
          <div className="h-full overflow-auto">
            <div className="min-w-175">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Task</th>
                    <th className="px-4 py-2.5 text-left">Project</th>
                    <th className="px-4 py-2.5 text-left">Priority</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Hours</th>
                    {isAdmin && <th className="px-4 py-2.5 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                            {task.name[0]?.toUpperCase() || "T"}
                          </div>
                          <span className="font-medium text-gray-800 text-sm">
                            {task.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        <div className="flex items-center gap-2 text-sm">
                          <Layers size={14} className="text-gray-400" />
                          {task.projectName ?? "Other"}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${priorityColor(
                            task.priority
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Select
                          value={task.status}
                          onValueChange={(value) =>
                            updateStatus(task.id, value as ApiTask["status"])
                          }
                        >
                          <SelectTrigger
                            className={`w-28 h-8 px-2 rounded-full text-xs font-medium border shadow-none focus:ring-0 ${statusColor(
                              task.status
                            )}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-md border bg-white p-1">
                            <SelectItem value="Pending" className="text-sm">
                              Pending
                            </SelectItem>
                            <SelectItem value="In Progress" className="text-sm">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Completed" className="text-sm">
                              Completed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-sm">
                        {task.task_Hours}h
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => editTask(task)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(task.id)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paginatedTasks.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdmin ? 6 : 5}
                        className="px-4 py-10 text-center text-gray-400 text-sm"
                      >
                        {hasActiveFilters ? (
                          <div className="flex flex-col items-center gap-2">
                            <p>No tasks match your filters.</p>
                            <button
                              onClick={clearFilters}
                              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                              Clear all filters
                            </button>
                          </div>
                        ) : (
                          "No tasks found."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {paginatedTasks.map((task) => (
            <MobileTaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEdit={editTask}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={updateStatus}
              projectName={task.projectName ?? "Other"}
            />
          ))}
          {paginatedTasks.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              {hasActiveFilters ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-gray-400 text-sm">No tasks match your filters.</p>
                  <button
                    onClick={clearFilters}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No tasks found.</p>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {sortedTasks.length > 0 && (
          <div className="bg-white border rounded-lg px-3 py-2 shadow-sm">
            {/* Desktop Pagination */}
            <div className="hidden sm:flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border rounded-md disabled:opacity-40 hover:bg-gray-50 text-xs"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={i}
                      onClick={() => dispatch({ type: "SET_PAGE", payload: pageNum })}
                      className={`px-2.5 py-1 rounded-md text-xs ${currentPage === pageNum ? "bg-indigo-600 text-white" : "border hover:bg-gray-50"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-1 text-xs">...</span>
                    <button onClick={() => dispatch({ type: "SET_PAGE", payload: totalPages })} className="px-2.5 py-1 rounded-md text-xs border hover:bg-gray-50">
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.min(currentPage + 1, totalPages) })}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border rounded-md disabled:opacity-40 hover:bg-gray-50 text-xs"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Mobile Pagination */}
            <div className="flex flex-col gap-3 sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })}
                  disabled={currentPage === 1}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-700 disabled:opacity-40 active:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => dispatch({ type: "SET_PAGE", payload: Math.min(currentPage + 1, totalPages) })}
                  disabled={currentPage === totalPages}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-700 disabled:opacity-40 active:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <TaskForm
          form={form}
          editing={editingTask !== null}
          onChange={handleChange}
          onClose={() => setShowForm(false)}
          projects={projects}
        />
      )}
    </MainLayout>
  );
}