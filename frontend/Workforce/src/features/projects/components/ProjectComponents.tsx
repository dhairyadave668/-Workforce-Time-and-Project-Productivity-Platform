import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Calendar, Clock, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import * as reportApi from "../../reports/api/reportApi";

export interface User {
  id: string;
  name: string;
  email: string | null;
  role: "admin" | "employee";
  avatar?: string | null;
  department?: string;
  status?: "active" | "inactive";
  joinDate?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  plannedHours: number;
  loggedHrs: number;
  color?: string;
  memberAllocations: {
    userId: string;
    allocatedHours: number;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    userAvatar?: string | null;
  }[];
}

export interface Task {
  id: string;
  name: string;
  projectId?: string;
  assignedTo?: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  estimate?: number;
  createdAt?: string;
  dueDate?: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  weekStart: string;
  status: string;
  totalHours: number;
  entries: {
    projectId: string;
    hours: number[];
    notes?: string[];
    progress?: number[];
    taskId?: string;
  }[];
  submittedAt?: string;
  remarks?: string;
}

const statusConfig: Record<string, { label: string; class: string; color: string }> = {
  active: {
    label: "Active",
    class: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    color: "#22c55e",
  },
  completed: {
    label: "Completed",
    class: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
    color: "#6b7280",
  },
  "on-hold": {
    label: "On Hold",
    class: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    color: "#f97316",
  },
  planning: {
    label: "Planning",
    class: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    color: "#3b82f6",
  },
};

interface ProjectCardProps {
  project: Project;
  users: User[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onClick: () => void;
  canEdit: boolean;
}

export function ProjectCard({ project, users, onEdit, onDelete, onClick, canEdit }: ProjectCardProps) {
  const members = useMemo(() => {
    const allocations = project.memberAllocations ?? [];
    return allocations.map(alloc => {
      if (alloc.userName) {
        return {
          id: alloc.userId,
          name: alloc.userName,
          avatar: alloc.userAvatar,
        };
      }
      const user = users.find(u => u.id === alloc.userId);
      return {
        id: alloc.userId,
        name: user?.name ?? "Unknown",
        avatar: user?.avatar,
      };
    });
  }, [project.memberAllocations, users]);

  const budgetPct = project.plannedHours > 0 ? Math.min(Math.round((project.loggedHrs / project.plannedHours) * 100), 100) : 0;
  const cfg = statusConfig[project.status] || statusConfig.active;

  const isEditDisabled = project.status === 'completed' || !canEdit;
  const isDeleteDisabled = project.status === 'active' || !canEdit;

  return (
    <Card
      onClick={onClick}
      className="bg-white border border-slate-200 shadow-none hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-pointer"
      data-testid={`project-card-${project.id}`}
    >
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cfg.color }}
            />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">{project.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{project.client}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${cfg.class}`}>
              {cfg.label}
            </span>
            {!isDeleteDisabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onDelete(project.id);
                }}
                className="text-xs px-2 py-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                data-testid={`delete-project-${project.id}`}
              >
                Delete
              </Button>
            )}
            <div className="relative inline-block">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                disabled={isEditDisabled}
                className="relative text-xs px-2 py-1 h-auto hover:bg-slate-100 hover:text-slate-900 z-10"
                data-testid={`edit-project-${project.id}`}
              >
                Edit
              </Button>
              {!isEditDisabled && (
                <div
                  className="absolute -top-5 -right-5 -bottom-[2.5px] left-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(project);
                  }}
                  style={{ pointerEvents: 'auto', zIndex: 0 }}
                />
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4 line-clamp-2 wrap-break-words">
          {project.description}
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time Spent
              </span>
              <span className="font-medium text-slate-700">
                {project.loggedHrs}h / {project.plannedHours}h
              </span>
            </div>
            <Progress
              value={budgetPct}
              className={`h-1.5 ${
                budgetPct > 90 ? "[&>div]:bg-red-500" : budgetPct > 70 ? "[&>div]:bg-amber-500" : ""
              }`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>
                {project.endDate
                  ? new Date(project.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex -space-x-1.5">
              {members.slice(0, 3).map((m) => (
                <Avatar key={m.id} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={m.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {m.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600 font-medium">
                  +{members.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectDetailsSheetProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  tasks: Task[];
  timesheets: Timesheet[];
  completedTaskIds?: Set<string>;
}

export function ProjectDetailsSheet({
  project,
  isOpen,
  onClose,
  users,
  tasks,
  // timesheets,
  // completedTaskIds = new Set(),
}: ProjectDetailsSheetProps) {
  const { data: breakdownData = [], isLoading: breakdownLoading } = useQuery({
    queryKey: ["projectBreakdown", project?.id],
    queryFn: () => reportApi.fetchProjectBreakdown(project!.id, undefined, undefined),
    enabled: !!project && isOpen,
    staleTime: 2 * 60 * 1000,
  });

  const stats = useMemo(() => {
    if (!project)
      return {
        totalHoursLogged: 0,
        memberStats: [] as any[],
        projectTasks: [] as Task[],
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        totalTasks: 0,
        plannedHours: 0,
        userMap: new Map<string, { name: string; email: string; role?: string }>(),
      };

    const totalHoursLogged = project.loggedHrs;

    const memberStats = breakdownData.map(item => {
      const user = users.find(u => u.id === item.userId);
      return {
        userId: item.userId,
        allocatedHours: item.plannedHours,
        loggedHours: item.loggedHours,
        userName: user?.name ?? item.userName,
        userEmail: user?.email ?? "",
        userRole: user?.role ?? "employee",
        userAvatar: user?.avatar,
      };
    }).sort((a, b) => b.loggedHours - a.loggedHours);

    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = projectTasks.filter((t) => t.status === "in-progress").length;
    const pendingTasks = projectTasks.filter((t) => t.status === "pending").length;

    const userMap = new Map();
    breakdownData.forEach(item => {
      userMap.set(item.userId, {
        name: item.userName,
        email: "",
        role: "employee",
      });
    });

    return {
      totalHoursLogged,
      memberStats,
      projectTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      totalTasks: projectTasks.length,
      plannedHours: project.plannedHours,
      userMap,
    };
  }, [project, tasks, users, breakdownData]);

  if (!project) return null;

  const budgetProgress = stats.plannedHours > 0 ? Math.min((stats.totalHoursLogged / stats.plannedHours) * 100, 100) : 0;

  if (breakdownLoading && isOpen) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-100 sm:w-135 overflow-y-auto bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-100 sm:w-135 overflow-y-auto bg-white">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={cn("capitalize", statusConfig[project.status]?.class)}>
              {statusConfig[project.status]?.label}
            </Badge>
            <span className="text-xs text-slate-500">{project.client}</span>
          </div>
          <SheetTitle className="text-2xl font-bold text-slate-900">{project.name}</SheetTitle>
          <SheetDescription>{project.description}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-100 w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
            <Card className="bg-slate-50 border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">Hours Completed</span>
                    <span className={cn(budgetProgress > 100 ? "text-red-600" : "text-slate-900")}>
                      {stats.totalHoursLogged.toFixed(1)} / {stats.plannedHours} h
                    </span>
                  </div>
                  <Progress
                    value={budgetProgress}
                    className={cn(
                      "h-2",
                      budgetProgress > 100
                        ? "[&>div]:bg-red-500"
                        : budgetProgress > 80
                        ? "[&>div]:bg-amber-500"
                        : ""
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Start Date</div>
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">End Date</div>
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Three‑card grid for task statuses */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-white">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.completedTasks}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Completed Tasks
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.inProgressTasks}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> In Progress Tasks
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.pendingTasks}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Circle className="w-3.5 h-3.5 text-amber-500" /> Pending Tasks
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4 animate-in slide-in-from-left-2 duration-300">
            <h3 className="text-sm font-semibold text-slate-900">Project Team ({stats.memberStats.length})</h3>
            <ScrollArea className="h-75 pr-4">
              <div className="space-y-3">
                {stats.memberStats.map((member) => {
                  const isOverAllocated = member.loggedHours > member.allocatedHours;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.userAvatar || undefined} />
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                            {member.userName?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{member.userName}</div>
                          <div className="text-xs text-slate-500 capitalize">{member.userRole || "Employee"}</div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-sm font-bold",
                            isOverAllocated ? "text-red-600" : "text-slate-700"
                          )}>
                            {member.loggedHours}h / {member.allocatedHours}h
                          </span>
                          {isOverAllocated && (
                            <div className="relative group">
                              <AlertCircle size={14} className="text-red-500 cursor-help" />
                              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                Exceeds allocated hours
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">logged / allocated</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 animate-in slide-in-from-left-2 duration-300">
            <h3 className="text-sm font-semibold text-slate-900">Tasks ({stats.totalTasks})</h3>
            <ScrollArea className="h-75 pr-4">
              <div className="space-y-2">
                {stats.projectTasks.length > 0 ? (
                  stats.projectTasks.map((task) => {
                    const assignee = stats.userMap.get(task.assignedTo || "");
                    const taskStatusMap: Record<string, { label: string; class: string }> = {
                      pending: { label: "Pending", class: "bg-amber-50 text-amber-700" },
                      "in-progress": { label: "In Progress", class: "bg-blue-50 text-blue-700" },
                      completed: { label: "Completed", class: "bg-green-50 text-green-700" },
                    };
                    const taskStatusConfig = taskStatusMap[task.status] || taskStatusMap.pending;
                    const priorityMap: Record<string, string> = {
                      low: "Low",
                      medium: "Medium",
                      high: "High",
                    };
                    const priorityLabel = priorityMap[task.priority] || "Medium";

                    return (
                      <div
                        key={task.id}
                        className="p-3 border border-slate-200 rounded-lg bg-white flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "text-sm font-medium truncate",
                            task.status === "completed" ? "line-through text-slate-500" : "text-slate-900"
                          )}>
                            {task.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-slate-100 text-slate-500">
                              {priorityLabel}
                            </Badge>
                            <Badge className={cn("text-[10px] h-5 px-1.5 font-normal", taskStatusConfig.class)}>
                              {taskStatusConfig.label}
                            </Badge>
                            <span className="text-[10px] text-slate-400">Est. {task.estimate}h</span>
                          </div>
                        </div>
                        <Avatar className="w-5 h-5 shrink-0">
                          <AvatarFallback className="text-[9px] bg-slate-100">
                            {assignee?.name?.charAt(0) ?? ""}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No tasks created for this project yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}