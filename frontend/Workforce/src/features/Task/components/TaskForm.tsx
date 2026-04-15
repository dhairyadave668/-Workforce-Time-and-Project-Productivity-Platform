import type { ChangeEvent } from "react";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Save,
  Plus,
  Edit,
  BarChart3,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask } from "../api/tasksApi";
import type { TaskInput } from "../types/taskTypes";
import type { Project } from "../../projects/components/ProjectComponents";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export type Task = {
  id?: string;
  name: string;
  projectId: string | null;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  task_Hours: string;
};

type Props = {
  form: Task;
  editing: boolean;
  originalTask?: Task; // Original task data for editing
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onClose: () => void;
  projects: Project[];
};

export default function TaskForm({
  form,
  editing,
  originalTask,
  onChange,
  onClose,
  projects,
}: Props) {
  const queryClient = useQueryClient();
  const { entraId } = useAuth();

  /* ================= STATE ================= */
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [nameError, setNameError] = useState("");
  const [hoursError, setHoursError] = useState("");

  /* ================= DERIVE ORIGINAL HOURS (FIXED) ================= */
  // Calculate original hours directly instead of using state + effect
  const originalHours = editing && originalTask?.task_Hours 
    ? Number(originalTask.task_Hours) 
    : null;

  /* ================= GET SELECTED PROJECT ================= */
  const selectedProject =
    form.projectId && form.projectId !== "other"
      ? projects.find((p) => p.id === form.projectId)
      : null;

  const plannedHours = selectedProject?.plannedHours || 0;
  const currentLoggedHrs = selectedProject?.loggedHrs || 0;
  const isProjectOverBudget = currentLoggedHrs > plannedHours;
  const overBudgetAmount = currentLoggedHrs - plannedHours;

  /* ================= VALIDATION FUNCTIONS ================= */
  const validateTaskName = (name: string) => {
    if (!name.trim()) return "Task name is required";
    if (!/[a-zA-Z]/.test(name)) return "Task name cannot be only numbers";
    return "";
  };

  const validateHours = useCallback(
    (hours: number) => {
      if (!hours || hours <= 0) return "Hours must be greater than 0";
      if (!selectedProject) return "";

      if (isProjectOverBudget) {
        return (
          `Cannot ${editing ? "update" : "add"} task: Project has already exceeded planned hours by ${overBudgetAmount} hrs. ` +
          `Please increase project planned hours or reduce existing tasks.`
        );
      }

      let netChange = hours;
      if (editing && originalHours !== null) {
        netChange = hours - originalHours;
      }

      const newTotalLoggedHrs = currentLoggedHrs + netChange;
      if (newTotalLoggedHrs > plannedHours) {
        const remaining = plannedHours - currentLoggedHrs;
        const netChangeText =
          editing && netChange !== 0
            ? ` (net change: ${netChange > 0 ? "+" : ""}${netChange} hrs)`
            : "";
        return (
          `Cannot ${editing ? "update" : "add"} task: Would exceed project planned hours. ` +
          `Remaining available: ${remaining} hrs | This task: ${hours} hrs${netChangeText} would make total: ${newTotalLoggedHrs}/${plannedHours} hrs`
        );
      }

      return "";
    },
    [
      selectedProject,
      isProjectOverBudget,
      overBudgetAmount,
      editing,
      originalHours,
      currentLoggedHrs,
      plannedHours,
    ]
  );

  /* ================= FILTER ================= */
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ================= MUTATIONS ================= */
  const createMutation = useMutation({
    mutationFn: (payload: TaskInput) => createTask(payload),

    onMutate: () => {
      toast.loading(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Creating task...</span>
        </div>,
        { duration: 2000 }
      );
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.dismiss();

      let successMessage = "";

      if (selectedProject && !isProjectOverBudget) {
        successMessage = `Task created successfully!\n\n`;
      }

      setTimeout(() => {
        toast.success(successMessage, { duration: 8000 });
      }, 100);

      onClose();
    },

    onError: (error: Error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to create task ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskInput }) =>
      updateTask({ id, data }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Task updated successfully ");
      onClose();
    },

    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task ");
    },
  });

  /* ================= CALCULATE NEW TOTAL FOR PREVIEW ================= */
  const calculateNewTotal = () => {
    if (!selectedProject || !form.task_Hours) return null;

    const newHours = Number(form.task_Hours);
    let netChange = newHours;

    if (editing && originalHours !== null) {
      netChange = newHours - originalHours;
    }

    return currentLoggedHrs + netChange;
  };

  /* ================= SAVE ================= */
  const handleSave = () => {
    const nameValidationError = validateTaskName(form.name);
    setNameError(nameValidationError);

    if (!entraId) {
      toast.error("User not authenticated ");
      return;
    }

    if (nameValidationError) return;

    if (!form.task_Hours) {
      toast.warning("Hours required ⚠️");
      return;
    }

    const hours = Number(form.task_Hours);

    if (selectedProject && isProjectOverBudget) {
      const errorMsg = `Cannot ${editing ? "update" : "add"} task: Project has exceeded planned hours by ${overBudgetAmount} hrs`;
      setHoursError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const hoursValidationError = validateHours(hours);
    if (hoursValidationError) {
      setHoursError(hoursValidationError);
      toast.error(hoursValidationError);
      return;
    }

    const payload: TaskInput = {
      name: form.name,
      projectId:
        form.projectId === "other" || form.projectId === ""
          ? null
          : form.projectId,
      priority: form.priority,
      status: form.status,
      task_Hours: hours,
      entraId,
    };

    if (editing && form.id) {
      updateMutation.mutate({ id: form.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  const isSaveDisabled: boolean =
    loading ||
    !!hoursError ||
    (!!selectedProject && isProjectOverBudget) ||
    (!!selectedProject &&
      !!form.task_Hours &&
      (() => {
        const hours = Number(form.task_Hours);
        let netChange = hours;
        if (editing && originalHours !== null) {
          netChange = hours - originalHours;
        }
        return currentLoggedHrs + netChange > plannedHours;
      })());

  /* ================= SELECT PROJECT ================= */
  const handleSelectProject = (projectId: string | null) => {
    const syntheticEvent = {
      target: {
        name: "projectId",
        value: projectId ?? "",
      },
    } as ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
    setDropdownOpen(false);
    setSearchQuery("");
    setHoursError("");
  };

  const selectedProjectName =
    form.projectId && form.projectId !== "other"
      ? projects.find((p) => p.id === form.projectId)?.name
      : form.projectId === "other"
      ? "Other (No hour limit)"
      : "";

  /* ================= HANDLE HOURS CHANGE ================= */
  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const hours = Number(value);

    onChange(e);

    if (selectedProject && value) {
      const error = validateHours(hours);
      setHoursError(error);

      if (error && !isProjectOverBudget) {
        toast.warning(error, { duration: 4000 });
      } else if (isProjectOverBudget) {
        toast.error(
          `Project is already over budget by ${overBudgetAmount} hrs`,
          { duration: 4000 }
        );
      }
    } else {
      setHoursError("");
    }
  };

  const newTotal = calculateNewTotal();
  const isIncreasingHours =
    editing &&
    originalHours !== null &&
    Number(form.task_Hours) > originalHours;
  const isDecreasingHours =
    editing &&
    originalHours !== null &&
    Number(form.task_Hours) < originalHours;
  const currentHoursValue = form.task_Hours ? Number(form.task_Hours) : 0;
  const isValidHours =
    currentHoursValue > 0 && !hoursError && !isProjectOverBudget;

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[500px] rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {editing ? (
              <Edit className="h-5 w-5 text-blue-600" />
            ) : (
              <Plus className="h-5 w-5 text-green-600" />
            )}
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Task" : "Add New Task"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          {/* TASK NAME */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              Task Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={(e) => {
                onChange(e);
                setNameError(validateTaskName(e.target.value));
              }}
              placeholder="e.g., Implement login flow"
              className={`mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ${
                nameError
                  ? "border-red-500 focus:ring-red-400"
                  : "focus:ring-blue-500"
              }`}
            />
            {nameError && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
          </div>

          {/* PROJECT DROPDOWN */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              Project
            </label>
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full border rounded-lg px-3 py-2 text-left flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
              >
                <span className={selectedProjectName ? "" : "text-gray-400"}>
                  {selectedProjectName || "Select Project"}
                </span>
                {dropdownOpen ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border rounded-md text-sm"
                      />
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        No projects found
                      </div>
                    ) : (
                      filteredProjects.map((project) => {
                        const isOverBudget =
                          project.loggedHrs > project.plannedHours;
                        const isFull =
                          project.loggedHrs >= project.plannedHours;

                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => handleSelectProject(project.id)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                              isFull ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            disabled={isFull}
                            title={
                              isOverBudget
                                ? "Project has exceeded planned hours"
                                : isFull
                                ? "Project has reached its planned hours limit"
                                : ""
                            }
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate flex-1 flex items-center gap-2">
                                {project.name}
                              </span>
                              <span
                                className={`text-xs ml-2 whitespace-nowrap flex items-center gap-1 ${
                                  isOverBudget
                                    ? "text-red-600 font-bold"
                                    : isFull
                                    ? "text-orange-600"
                                    : "text-green-600"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {project.loggedHrs}/{project.plannedHours} hrs
                                {isOverBudget &&
                                  ` (Over by ${project.loggedHrs - project.plannedHours})`}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t">
                    <button
                      type="button"
                      onClick={() => handleSelectProject("other")}
                      className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Other (No hour limit)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PROJECT HOURS INFO */}
          {selectedProject && (
            <div
              className={`p-3 rounded-lg space-y-1 ${
                isProjectOverBudget
                  ? "bg-red-50 border border-red-200"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Planned Hours:
                </span>
                <span className="font-medium">{plannedHours} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Logged Hours:
                </span>
                <span
                  className={`font-medium ${
                    isProjectOverBudget
                      ? "text-red-600 font-bold"
                      : "text-green-600"
                  }`}
                >
                  {currentLoggedHrs} hrs
                </span>
              </div>
              {!isProjectOverBudget && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Remaining:
                  </span>
                  <span
                    className={`font-medium ${
                      plannedHours - currentLoggedHrs <= 0
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {Math.max(0, plannedHours - currentLoggedHrs)} hrs
                  </span>
                </div>
              )}

              {/* Preview new total */}
              {isValidHours && newTotal !== null && !isProjectOverBudget && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    New Total (if saved):
                  </span>
                  <div className="text-right">
                    <span
                      className={`font-medium flex items-center gap-1 ${
                        newTotal > plannedHours
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {newTotal} hrs
                    </span>
                    {editing &&
                      originalHours !== null &&
                      currentHoursValue !== originalHours && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isIncreasingHours && (
                            <span className="text-orange-500 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{currentHoursValue - originalHours} hrs increase
                            </span>
                          )}
                          {isDecreasingHours && (
                            <span className="text-green-500 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {currentHoursValue - originalHours} hrs decrease
                            </span>
                          )}
                          <span className="block">(was {originalHours} hrs)</span>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Error messages */}
              {hoursError && (
                <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                  <p className="text-red-700 text-xs whitespace-pre-wrap flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    {hoursError}
                  </p>
                </div>
              )}

              {isProjectOverBudget && (
                <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                  <div className="flex items-center gap-1 text-red-700 text-sm font-medium mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Project is over budget by {overBudgetAmount} hours!
                    </span>
                  </div>
                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Cannot add or update tasks. Please increase planned hours or
                    reduce existing tasks.
                  </p>
                </div>
              )}

              {!isProjectOverBudget &&
                plannedHours - currentLoggedHrs === 0 &&
                !hoursError && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="flex items-center gap-1 text-yellow-700 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        Project has reached its planned hours limit. No more
                        hours available.
                      </span>
                    </div>
                  </div>
                )}

              {editing &&
                !isProjectOverBudget &&
                originalHours !== null &&
                !hoursError && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center gap-1 text-blue-700 text-xs">
                      <Edit className="h-3 w-3" />
                      <span>
                        Editing task: Original hours = {originalHours} hrs
                      </span>
                    </div>
                    {currentHoursValue !== originalHours && (
                      <span className="block mt-1 text-xs">
                        {currentHoursValue > originalHours
                          ? `⚠️ Increasing by ${currentHoursValue - originalHours} hrs will consume additional capacity`
                          : `✅ Decreasing by ${originalHours - currentHoursValue} hrs will free up capacity`}
                      </span>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* PRIORITY + HOURS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                Priority *
              </label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  onChange({
                    target: { name: "priority", value },
                  } as React.ChangeEvent<HTMLSelectElement>)
                }
              >
                <SelectTrigger
                  className={`
                    w-full h-10 px-3 rounded-lg text-sm font-medium
                    border shadow-sm mt-1
                    ${
                      form.priority === "Low"
                        ? "bg-green-50 border-green-300 text-green-700"
                        : form.priority === "Medium"
                        ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                        : "bg-red-50 border-red-300 text-red-700"
                    }
                  `}
                >
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>

                <SelectContent className="rounded-xl shadow-xl border bg-white p-1">
                  <SelectItem
                    value="Low"
                    className="cursor-pointer text-sm hover:bg-green-50 focus:bg-green-100"
                  >
                    <div className="flex items-center gap-2">Low</div>
                  </SelectItem>
                  <SelectItem
                    value="Medium"
                    className="cursor-pointer text-sm hover:bg-yellow-50 focus:bg-yellow-100"
                  >
                    <div className="flex items-center gap-2">Medium</div>
                  </SelectItem>
                  <SelectItem
                    value="High"
                    className="cursor-pointer text-sm hover:bg-red-50 focus:bg-red-100"
                  >
                    <div className="flex items-center gap-2">High</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                Task Hours *
              </label>
              <input
                name="task_Hours"
                type="number"
                min="0"
                step="0.5"
                value={form.task_Hours}
                onChange={handleHoursChange}
                placeholder="Enter hours"
                disabled={isProjectOverBudget}
                className={`mt-1 border rounded-lg px-3 py-2 w-full outline-none focus:ring-2 ${
                  isProjectOverBudget ? "bg-gray-100 cursor-not-allowed" : ""
                } ${
                  hoursError
                    ? "border-red-500 focus:ring-red-400"
                    : "focus:ring-blue-500"
                }`}
              />
            </div>
          </div>

          {/* STATUS */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              Status *
            </label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                onChange({
                  target: { name: "status", value },
                } as React.ChangeEvent<HTMLSelectElement>)
              }
            >
              <SelectTrigger
                className={`
                  w-full h-10 px-3 rounded-lg text-sm font-medium
                  border shadow-sm mt-1
                  ${
                    form.status === "Pending"
                      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                      : form.status === "In Progress"
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-green-50 border-green-300 text-green-700"
                  }
                `}
              >
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>

              <SelectContent className="rounded-xl shadow-xl border bg-white p-1">
                <SelectItem
                  value="Pending"
                  className="cursor-pointer text-sm hover:bg-yellow-50 focus:bg-yellow-100"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-600" />
                    Pending
                  </div>
                </SelectItem>
                <SelectItem
                  value="In Progress"
                  className="cursor-pointer text-sm hover:bg-blue-50 focus:bg-blue-100"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 text-blue-600" />
                    In Progress
                  </div>
                </SelectItem>
                <SelectItem
                  value="Completed"
                  className="cursor-pointer text-sm hover:bg-green-50 focus:bg-green-100"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Completed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border rounded-lg py-2 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={`flex-1 rounded-lg py-2 transition-colors flex items-center justify-center gap-2 ${
              isSaveDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {editing ? "Update Task" : "Add Task"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}