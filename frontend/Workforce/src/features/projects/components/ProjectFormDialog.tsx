import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Trash2, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import type { User, Project, Task, Timesheet } from "./ProjectComponents";

type ProjectStatus = "active" | "completed" | "on-hold" | "planning";

// Validation helpers (unchanged)
const validateName = (name: string, fieldName: string): string | undefined => {
  if (!name.trim()) return `${fieldName} is required`;
  if (!/^[A-Za-z\s]+$/.test(name)) return `${fieldName} must contain only letters and spaces`;
  return undefined;
};

const validateTaskName = (name: string): string | undefined => {
  if (!name.trim()) return "Task name is required";
  if (!/^[A-Za-z\s]+$/.test(name)) return "Task name must contain only letters and spaces";
  return undefined;
};

const validateDates = (start: string, end: string): string | undefined => {
  if (!start || !end) return undefined;
  if (start === end) return "Start date and end date cannot be the same";
  if (start > end) return "End date must be after start date";
  return undefined;
};

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  users: User[];
  existingTasks: Task[];
  timesheets?: Timesheet[];
  completedTaskIds?: Set<string>;
  onSave: (projectData: Partial<Project>, tasks: any[]) => void;
  isSaving: boolean;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  users,
  existingTasks,
  timesheets,
  completedTaskIds = new Set(),
  onSave,
  isSaving,
}: ProjectFormDialogProps) {
  const isEditing = !!project;

  // Form state
  const [form, setForm] = useState<{
    name: string;
    client: string;
    status: ProjectStatus;
    description: string;
    startDate: string;
    endDate: string;
    plannedHours: string;
    color: string;
    memberAllocations: { userId: string; allocatedHours: number | null }[];
  }>({
    name: "",
    client: "",
    status: "planning",
    description: "",
    startDate: "",
    endDate: "",
    plannedHours: "",
    color: "#4F46E5",
    memberAllocations: [],
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    client?: string;
    dates?: string;
    totalAllocated?: string;
    totalTasks?: string;
  }>({});

  const [stagedTasks, setStagedTasks] = useState<any[]>([]);
  const [newTaskForm, setNewTaskForm] = useState({
    name: "",
    estimate: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [taskError, setTaskError] = useState<string | undefined>();

  // Task filter state
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [taskSearchTerm, setTaskSearchTerm] = useState<string>("");

  // Reset form when project changes (dialog opens)
  useEffect(() => {
    if (open) {
      if (project) {
        // Editing: populate form
        setForm({
          name: project.name,
          client: project.client,
          status: project.status as ProjectStatus,
          description: project.description || "",
          startDate: project.startDate || "",
          endDate: project.endDate || "",
          plannedHours: project.plannedHours.toString(),
          color: project.color || "#4F46E5",
          memberAllocations: project.memberAllocations.map(a => ({
            userId: a.userId,
            allocatedHours: a.allocatedHours,
          })),
        });
        setStagedTasks(
          existingTasks.map(t => ({
            id: t.id,
            name: t.name,
            estimate: t.estimate,
            priority: t.priority,
            status: t.status,
          }))
        );
      } else {
        // Create: reset form
        setForm({
          name: "",
          client: "",
          status: "planning",
          description: "",
          startDate: "",
          endDate: "",
          plannedHours: "",
          color: "#4F46E5",
          memberAllocations: [],
        });
        setStagedTasks([]);
        setNewTaskForm({ name: "", estimate: "", priority: "medium" });
      }
      setFormErrors({});
      setTaskError(undefined);
      setTaskFilterStatus("all");
      setTaskSearchTerm("");
    }
  }, [open, project, existingTasks]);

  // Immediate date validation
  useEffect(() => {
    const datesError = validateDates(form.startDate, form.endDate);
    setFormErrors(prev => ({ ...prev, dates: datesError }));
  }, [form.startDate, form.endDate]);

  // Compute logged hours per member for the current project (only when editing)
  const memberLoggedHours = useMemo(() => {
    if (!isEditing || !timesheets) return new Map<string, number>();
    const map = new Map<string, number>();
    timesheets.forEach((ts) => {
      const projectEntries = ts.entries?.filter(e =>
        e.projectId === project.id &&
        e.taskId && completedTaskIds.has(e.taskId)
      ) ?? [];
      const total = projectEntries.reduce(
        (sum, entry) => sum + entry.hours.reduce((hSum, h) => hSum + (h || 0), 0),
        0
      );
      if (total > 0) {
        map.set(ts.userId, (map.get(ts.userId) || 0) + total);
      }
    });
    return map;
  }, [isEditing, project, timesheets, completedTaskIds]);

  // Computed totals
  const plannedHoursNum = useMemo(() => {
    const val = parseFloat(form.plannedHours);
    return isNaN(val) ? 0 : val;
  }, [form.plannedHours]);

  const totalAllocated = useMemo(() => {
    return form.memberAllocations.reduce((sum, a) => sum + (a.allocatedHours ?? 0), 0);
  }, [form.memberAllocations]);

  const totalTaskEstimates = useMemo(() => {
    return stagedTasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
  }, [stagedTasks]);

  const remainingHours = useMemo(() => {
    return plannedHoursNum - totalTaskEstimates;
  }, [plannedHoursNum, totalTaskEstimates]);

  // Validate totals and set errors
  useEffect(() => {
    const errors: typeof formErrors = { ...formErrors };
    if (plannedHoursNum > 0) {
      if (totalAllocated > plannedHoursNum) {
        errors.totalAllocated = `Total allocated hours (${totalAllocated}) exceed project estimate (${plannedHoursNum})`;
      } else {
        delete errors.totalAllocated;
      }
      if (totalTaskEstimates > plannedHoursNum) {
        errors.totalTasks = `Total task estimates (${totalTaskEstimates}) exceed project estimate (${plannedHoursNum})`;
      } else {
        delete errors.totalTasks;
      }
    } else {
      if (totalAllocated > 0) {
        errors.totalAllocated = `Allocated hours (${totalAllocated}) exceed project estimate (0)`;
      } else {
        delete errors.totalAllocated;
      }
      if (totalTaskEstimates > 0) {
        errors.totalTasks = `Task estimates (${totalTaskEstimates}) exceed project estimate (0)`;
      } else {
        delete errors.totalTasks;
      }
    }
    setFormErrors(errors);
  }, [totalAllocated, totalTaskEstimates, plannedHoursNum]);

  // Handlers
  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z\s]/g, "");
    setForm({ ...form, name: value });
    setFormErrors(prev => ({ ...prev, name: validateName(value, "Project name") }));
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z\s]/g, "");
    setForm({ ...form, client: value });
    setFormErrors(prev => ({ ...prev, client: validateName(value, "Client") }));
  };

  const handleTaskNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z\s]/g, "");
    setNewTaskForm({ ...newTaskForm, name: value });
    setTaskError(validateTaskName(value));
  };

  const handleTaskEstimateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || (Number(val) >= 0 && !isNaN(Number(val)))) {
      setNewTaskForm({ ...newTaskForm, estimate: val });
      if (val !== "") {
        const estimate = parseFloat(val);
        if (!isNaN(estimate) && estimate > 0) {
          if (plannedHoursNum > 0 && totalTaskEstimates + estimate > plannedHoursNum) {
            setTaskError(`Estimate would exceed remaining project hours (remaining: ${remainingHours})`);
            return;
          }
        }
      }
      setTaskError(undefined);
    }
  };

  const handleTaskPriorityChange = (value: string) => {
    setNewTaskForm({ ...newTaskForm, priority: value as "low" | "medium" | "high" });
  };

  const isAddTaskDisabled = useMemo(() => {
    if (plannedHoursNum > 0 && totalTaskEstimates >= plannedHoursNum) return true;
    const nameError = validateTaskName(newTaskForm.name);
    if (nameError) return true;
    const estimate = parseFloat(newTaskForm.estimate);
    if (isNaN(estimate) || estimate <= 0) return true;
    if (plannedHoursNum > 0 && totalTaskEstimates + estimate > plannedHoursNum) return true;
    return false;
  }, [newTaskForm.name, newTaskForm.estimate, plannedHoursNum, totalTaskEstimates]);

  const handleAddTaskToForm = () => {
    const nameError = validateTaskName(newTaskForm.name);
    if (nameError) {
      setTaskError(nameError);
      return;
    }
    const estimate = parseFloat(newTaskForm.estimate);
    if (isNaN(estimate) || estimate <= 0) {
      toast.error("Valid estimate hours required");
      return;
    }
    if (plannedHoursNum > 0 && totalTaskEstimates + estimate > plannedHoursNum) {
      setTaskError(`Adding this task would exceed project estimate of ${plannedHoursNum} hours`);
      return;
    }
    setStagedTasks([...stagedTasks, {
      ...newTaskForm,
      estimate,
      status: "pending",
      id: `temp_${Date.now()}`
    }]);
    setNewTaskForm({ name: "", estimate: "", priority: "medium" });
    setTaskError(undefined);
  };

  const removeStagedTask = (idx: number) => {
    setStagedTasks(stagedTasks.filter((_, i) => i !== idx));
  };

  const toggleMember = (userId: string, checked: boolean) => {
    if (checked) {
      setForm(prev => ({
        ...prev,
        memberAllocations: [...prev.memberAllocations, { userId, allocatedHours: null }],
      }));
    } else {
      setForm(prev => ({
        ...prev,
        memberAllocations: prev.memberAllocations.filter(a => a.userId !== userId),
      }));
    }
  };

  const updateMemberHours = (userId: string, hours: number | null) => {
    setForm(prev => ({
      ...prev,
      memberAllocations: prev.memberAllocations.map(a =>
        a.userId === userId ? { ...a, allocatedHours: hours } : a
      ),
    }));
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    const nameError = validateName(form.name, "Project name");
    if (nameError) errors.name = nameError;
    const clientError = validateName(form.client, "Client");
    if (clientError) errors.client = clientError;
    const datesError = validateDates(form.startDate, form.endDate);
    if (datesError) errors.dates = datesError;
    if (plannedHoursNum > 0) {
      if (totalAllocated > plannedHoursNum) {
        errors.totalAllocated = `Total allocated hours (${totalAllocated}) exceed project estimate (${plannedHoursNum})`;
      }
      if (totalTaskEstimates > plannedHoursNum) {
        errors.totalTasks = `Total task estimates (${totalTaskEstimates}) exceed project estimate (${plannedHoursNum})`;
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    const projectData = {
      name: form.name,
      client: form.client,
      status: form.status,
      description: form.description || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      plannedHours: Number(form.plannedHours) || 0,
      color: form.color,
      memberAllocations: form.memberAllocations
        .filter(alloc => /^[0-9a-fA-F-]{36}$/.test(alloc.userId))
        .map(alloc => ({
          userId: alloc.userId,
          allocatedHours: alloc.allocatedHours ?? 0,
        })),
    };
    onSave(projectData, stagedTasks);
  };

  // Filtered tasks based on status and search term
  const filteredStagedTasks = useMemo(() => {
    return stagedTasks.filter(task => {
      const matchesStatus = taskFilterStatus === "all" || task.status === taskFilterStatus;
      const matchesSearch = taskSearchTerm === "" || task.name.toLowerCase().includes(taskSearchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [stagedTasks, taskFilterStatus, taskSearchTerm]);

  // Helper to open date picker on click
  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.currentTarget as HTMLInputElement).showPicker?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl h-full sm:h-auto rounded-none sm:rounded-lg p-0 flex flex-col bg-white">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>{isEditing ? "Edit Project" : "Create New Project"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-slate-100 w-full justify-start mb-4 shrink-0 overflow-x-auto flex-nowrap px-4 sm:px-6">
            <TabsTrigger value="details" className="text-sm">Details</TabsTrigger>
            <TabsTrigger value="members" className="text-sm">Team</TabsTrigger>
            <TabsTrigger value="tasks" className="text-sm">Tasks</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            {/* Details Tab – unchanged */}
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="e.g., Website Redesign"
                    value={form.name}
                    onChange={handleProjectNameChange}
                    data-testid="project-name-input"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label>Client *</Label>
                  <Input
                    placeholder="e.g., TechCorp Inc."
                    value={form.client}
                    onChange={handleClientNameChange}
                    data-testid="project-client-input"
                  />
                  {formErrors.client && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.client}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, startDate: e.target.value })}
                    onClick={handleDateClick}
                    data-testid="project-start-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, endDate: e.target.value })}
                    onClick={handleDateClick}
                    data-testid="project-end-input"
                  />
                </div>
                {formErrors.dates && (
                  <div className="col-span-1 sm:col-span-2">
                    <p className="text-xs text-red-500">{formErrors.dates}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="120"
                    value={form.plannedHours}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      if (val === "" || (Number(val) >= 0 && !isNaN(Number(val)))) {
                        setForm({ ...form, plannedHours: val });
                      }
                    }}
                    data-testid="project-hours-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: ProjectStatus) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger data-testid="project-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description..."
                    value={form.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
                    data-testid="project-desc-input"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Members Tab – unchanged */}
            <TabsContent value="members" className="space-y-4 mt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Select Team Members & Allocate Hours</Label>
                  <span className="text-xs text-slate-500">
                    {form.memberAllocations.length} selected
                  </span>
                </div>
                {formErrors.totalAllocated && (
                  <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 p-2 rounded">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.totalAllocated}</span>
                  </div>
                )}
                <ScrollArea className="h-75 w-full rounded-md border p-2">
                  {users.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      No users found. Add users in User Management.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => {
                        const allocation = form.memberAllocations.find(a => a.userId === user.id);
                        const isSelected = !!allocation;
                        const allocatedHours = allocation?.allocatedHours ?? null;
                        const loggedHours = memberLoggedHours.get(user.id) ?? 0;
                        const isOverAllocated = isSelected && (loggedHours > (allocatedHours ?? 0));

                        return (
                          <div
                            key={user.id}
                            className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded transition-colors"
                          >
                            <Checkbox
                              id={`user-${user.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleMember(user.id, !!checked)}
                              className="mt-1"
                            />
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900 text-sm truncate">
                                  {user.name}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {user.email}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] h-5 capitalize shrink-0">
                                {user.role}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {isSelected && isOverAllocated && (
                                  <div className="relative group">
                                    <AlertCircle size={14} className="text-red-500 cursor-help" />
                                    <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                      Logged hours ({loggedHours}h) exceed allocated
                                    </div>
                                  </div>
                                )}
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  className="w-20 h-8 text-sm"
                                  placeholder="Hrs"
                                  disabled={!isSelected}
                                  value={isSelected ? allocatedHours ?? "" : ""}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value;
                                    if (value === "") {
                                      updateMemberHours(user.id, null);
                                    } else {
                                      const hours = parseFloat(value);
                                      if (!isNaN(hours) && hours >= 0) {
                                        updateMemberHours(user.id, hours);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Tasks Tab – properly aligned task creation form */}
            <TabsContent value="tasks" className="space-y-4 mt-0">
              <div className="space-y-3">
                {/* Add task form – using items-end for correct alignment */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs">Task Name</Label>
                      <Input
                        placeholder="New task name"
                        className="h-8 text-sm"
                        value={newTaskForm.name}
                        onChange={handleTaskNameChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Estimate (hrs)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="4"
                        className="h-8 text-sm"
                        value={newTaskForm.estimate}
                        onChange={handleTaskEstimateChange}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Priority</Label>
                      <Select
                        value={newTaskForm.priority}
                        onValueChange={handleTaskPriorityChange}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Button
                        size="sm"
                        className="w-full h-8 bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleAddTaskToForm}
                        disabled={isAddTaskDisabled}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-[18px]">
                    {taskError && (
                      <p className="text-xs text-red-500">{taskError}</p>
                    )}
                  </div>
                </div>

                {/* Filter UI */}
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search tasks..."
                      className="pl-8 h-8 text-sm"
                      value={taskSearchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="h-62.5 w-full rounded-md border border-slate-200">
                  {filteredStagedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <p className="text-sm">No tasks match the filter.</p>
                      <p className="text-xs">Add tasks to kickstart the project.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredStagedTasks.map((task, idx) => (
                        <div
                          key={task.id || idx}
                          className="p-3 flex items-center justify-between hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {task.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{task.estimate}h • {task.priority}</span>
                                <Badge variant="outline" className="text-[10px] h-5 capitalize">
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStagedTask(idx)}
                            className="text-red-500 h-8 w-8 p-0 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </div>

          <div className="flex gap-3 p-4 sm:p-6 border-t border-slate-100 shrink-0">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-slate-900 hover:bg-slate-800"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="create-project-submit-btn"
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}