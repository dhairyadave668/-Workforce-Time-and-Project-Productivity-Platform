// ProjectsPage.tsx – using backend logged hours endpoint + full task CRUD

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/shared/components/layout/MainLayout";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Search, FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProjectCard, ProjectDetailsSheet } from "./ProjectComponents";
import { ProjectFormDialog } from "./ProjectFormDialog";
import type { User, Project, Task } from "./ProjectComponents";
import * as projectApi from "../api/projectApi";
import * as tasksApi from "../../Task/api/tasksApi";
import type { ApiTask } from "../../Task/api/tasksApi";
import { useAuth } from "@/features/auth/hooks/useAuth";

// Skeleton components (unchanged)
function SkeletonCell({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />;
}

function ProjectsSkeletonLoader() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 w-full min-h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <SkeletonCell className="h-4 w-48" />
            <SkeletonCell className="h-3 w-32 mt-1" />
          </div>
          <div className="flex gap-2">
            <SkeletonCell className="h-9 w-32 rounded-md" />
          </div>
        </div>
        <div className="relative w-full max-w-sm">
          <SkeletonCell className="h-9 w-full rounded-md" />
        </div>
        <div className="flex gap-2 border-b pb-2 overflow-x-auto">
          {["all", "active", "planning", "completed", "on-hold"].map((tab) => (
            <SkeletonCell key={tab} className="h-9 w-24 rounded-md shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <SkeletonCell className="w-3 h-3 rounded-full" />
                  <div>
                    <SkeletonCell className="h-4 w-28" />
                    <SkeletonCell className="h-3 w-20 mt-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <SkeletonCell className="h-6 w-12 rounded-full" />
                  <SkeletonCell className="h-6 w-12 rounded-md" />
                </div>
              </div>
              <SkeletonCell className="h-8 w-full" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <SkeletonCell className="h-3 w-20" />
                  <SkeletonCell className="h-3 w-16" />
                </div>
                <SkeletonCell className="h-1.5 w-full" />
              </div>
              <div className="flex justify-between items-center">
                <SkeletonCell className="h-3 w-24" />
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map((i) => (
                    <SkeletonCell key={i} className="w-6 h-6 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

// Helper to transform backend timesheet to local Timesheet type
const mapBackendTimesheetToLocalTimesheet = (backendTimesheet: any): any => ({
  id: backendTimesheet.id,
  userId: backendTimesheet.userId,
  weekStart: backendTimesheet.entryDate,
  status: "submitted",
  totalHours: backendTimesheet.hours,
  entries: [
    {
      projectId: backendTimesheet.projectId,
      hours: [backendTimesheet.hours],
      notes: backendTimesheet.note ? [backendTimesheet.note] : [],
      progress: [0],
      taskId: backendTimesheet.taskId,
    },
  ],
  submittedAt: backendTimesheet.entryDate,
  remarks: "",
});

// Map API task to local Task
const mapApiTaskToLocalTask = (apiTask: ApiTask): Task => {
  const statusMap: Record<string, "pending" | "in-progress" | "completed"> = {
    Pending: "pending",
    "In Progress": "in-progress",
    Completed: "completed",
  };
  const priorityMap: Record<string, "low" | "medium" | "high"> = {
    Low: "low",
    Medium: "medium",
    High: "high",
  };
  return {
    id: apiTask.id,
    name: apiTask.name,
    projectId: apiTask.projectId ?? undefined,
    status: statusMap[apiTask.status] || "pending",
    priority: priorityMap[apiTask.priority] || "medium",
    estimate: apiTask.task_Hours,
  };
};

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";

  const { userRole, entraId, isAuthReady } = useAuth();
  const normalizedRole = userRole?.toLowerCase().trim();
  const isAdmin = normalizedRole === "admin";
  const isEmployee = normalizedRole === "employee";

  const queryClient = useQueryClient();

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userFetchErrorMsg, setUserFetchErrorMsg] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch all users
  const { data: dbUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => projectApi.fetchUsers(),
    retry: false,
    enabled: isAuthReady && isAdmin,   // ✅ only admin,
  });
// 2. Build displayUsers for UI components (admins get full list, employees get only themselves)
// const displayUsers = useMemo((): User[] => {
//   if (isAdmin && dbUsers.length > 0) return dbUsers;
//   if (currentUser) return [currentUser];
//   return [];
// }, [dbUsers, currentUser, isAdmin]);
  // Current user query
  const {
    data: currentUserRaw,
    isLoading: loadingCurrentUser,
  } = useQuery({
    queryKey: ["currentUser", entraId],
    queryFn: async () => {
      if (!entraId) throw new Error("No Entra ID available");
      try {
        const user = await projectApi.fetchCurrentUserByEntraId(entraId);
        setUserFetchErrorMsg(null);
        return user;
      } catch (err) {
        setUserFetchErrorMsg(`Unable to load your user profile. ${err instanceof Error ? err.message : "Please try refreshing."}`);
        throw err;
      }
    },
    enabled: !!entraId && isAuthReady,
    retry: false,
  });

  const currentUser: User | undefined = useMemo(() => {
    if (!currentUserRaw) return undefined;
    return {
      id: currentUserRaw.id,
      name: currentUserRaw.name,
      email: currentUserRaw.email,
      role: currentUserRaw.role as "admin" | "employee",
    };
  }, [currentUserRaw]);

  // ✅ Fetch projects WITH pre‑computed logged hours (backend does the calculation)
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projectsWithLoggedHours", status, search],
    queryFn: () => projectApi.fetchProjectsWithLoggedHours(status, search),
    enabled: isAuthReady,
  });
// ✅ Fetch ALL projects (no status/search) for accurate tab counts
const { data: allProjectsUnfiltered = [] } = useQuery({
  queryKey: ["projectsWithLoggedHours", "all", ""], // status=all, search empty
  queryFn: () => projectApi.fetchProjectsWithLoggedHours("all", ""),
  enabled: isAuthReady,
});
  // ✅ All tasks (including pending) – for display in dialog and sheet
  const { data: allTasks = [] } = useQuery({
    queryKey: ["allTasks"],
    queryFn: tasksApi.fetchTasks,
    enabled: isAuthReady,
  });

  // ✅ Non‑pending tasks – for building the set of task IDs that count toward logged hours
  const { data: nonPendingTasks = [] } = useQuery({
    queryKey: ["nonPendingTasks"],
    queryFn: tasksApi.fetchNonPendingTasks,
    enabled: isAuthReady,
  });

  // Set of non‑pending task IDs (used to filter timesheet entries)
  const nonPendingTaskIds = useMemo(() => {
    return new Set(nonPendingTasks.map((t: ApiTask) => t.id));
  }, [nonPendingTasks]);

  // ✅ Fetch timesheets (only entries linked to non‑pending tasks) – needed for member logged hours in dialog/sheet
  const { data: rawTimesheets = [] } = useQuery({
    queryKey: ["filteredTimesheets"],
    queryFn: projectApi.fetchFilteredTimesheets,
    enabled: isAuthReady,
    retry: false,
  });

  // Transform raw timesheets for the details sheet
  const timesheets = useMemo(() => {
    return rawTimesheets.map(mapBackendTimesheetToLocalTimesheet);
  }, [rawTimesheets]);

  const currentUserId = currentUser?.id || null;
// Apply member filtering to the unfiltered list for counts
const memberFilteredAllProjects = useMemo(() => {
  if (isAdmin) return allProjectsUnfiltered;
  if (isEmployee) {
    if (!currentUserId) return [];
    return allProjectsUnfiltered.filter(project =>
      project.memberAllocations.some(alloc => alloc.userId === currentUserId)
    );
  }
  return [];
}, [allProjectsUnfiltered, isAdmin, isEmployee, currentUserId]);
  // Filter projects by member allocation (employees only see their projects)
  const memberFilteredProjects = useMemo(() => {
    if (isAdmin) return projects;
    if (isEmployee) {
      if (!currentUserId) return [];
      return projects.filter(project =>
        project.memberAllocations.some(alloc => alloc.userId === currentUserId)
      );
    }
    return [];
  }, [projects, isAdmin, isEmployee, currentUserId]);
const displayUsers = useMemo((): User[] => {
  if (isAdmin && dbUsers.length > 0) return dbUsers;
  if (currentUser) return [currentUser];
  return [];
}, [dbUsers, currentUser, isAdmin]);

  const filteredProjects = memberFilteredProjects;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, search, memberFilteredProjects.length]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

 // Update counts to use memberFilteredAllProjects (unfiltered by status/search)
const counts = useMemo(() => ({
  all: memberFilteredAllProjects.length,
  active: memberFilteredAllProjects.filter(p => p.status === "active").length,
  planning: memberFilteredAllProjects.filter(p => p.status === "planning").length,
  completed: memberFilteredAllProjects.filter(p => p.status === "completed").length,
  "on-hold": memberFilteredAllProjects.filter(p => p.status === "on-hold").length,
}), [memberFilteredAllProjects]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectApi.createProject(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
      queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["nonPendingTasks"] });
      toast.success("Project created");
      setDialogOpen(false);
    },
    onError: () => toast.error("Creation failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectApi.updateProject(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
      queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["nonPendingTasks"] });
      toast.success("Project updated");
      setDialogOpen(false);
    },
    onError: () => toast.error("Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
      queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["nonPendingTasks"] });
      toast.success("Project deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const handleDelete = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete);
    }
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  // Sync project tasks (unchanged logic, but invalidates both task queries)
 // Sync project tasks (corrected)
const syncProjectTasks = async (projectId: string, stagedTasks: any[]) => {
  // ✅ Ensure entraId is available (should never be null when this runs)
  if (!entraId) throw new Error("User not authenticated");

  const existingTasks = allTasks.filter((t: ApiTask) => t.projectId === projectId);
  const existingMap = new Map(existingTasks.map(t => [t.id, t]));

  for (const staged of stagedTasks) {
    if (staged.id && !staged.id.startsWith('temp_')) {
      const existing = existingMap.get(staged.id);
      if (existing) {
        const updatePayload = {
          name: staged.name,
          priority: (staged.priority.charAt(0).toUpperCase() + staged.priority.slice(1)) as "Low" | "Medium" | "High",
          status: existing.status as "Pending" | "In Progress" | "Completed",
          task_Hours: staged.estimate,
          projectId,
          entraId,                 // ✅ now required
        };
        await tasksApi.updateTask({ id: staged.id, data: updatePayload });
      }
    } else {
      const createPayload = {
        name: staged.name,
        priority: (staged.priority.charAt(0).toUpperCase() + staged.priority.slice(1)) as "Low" | "Medium" | "High",
        status: "Pending" as const,
        task_Hours: staged.estimate,
        projectId,
        entraId,                  // ✅ now included
      };
      await tasksApi.createTask(createPayload);
    }
  }

  const stagedIds = new Set(stagedTasks.filter(t => t.id && !t.id.startsWith('temp_')).map(t => t.id));
  for (const existing of existingTasks) {
    if (!stagedIds.has(existing.id)) {
      // ✅ deleteTask now expects an object with id and entraId
      await tasksApi.deleteTask({ id: existing.id, entraId });
    }
  }

  queryClient.invalidateQueries({ queryKey: ["allTasks"] });
  queryClient.invalidateQueries({ queryKey: ["nonPendingTasks"] });
  queryClient.invalidateQueries({ queryKey: ["filteredTimesheets"] });
  queryClient.invalidateQueries({ queryKey: ["projectsWithLoggedHours"] });
};

  const handleSaveProject = async (projectData: Partial<Project>, stagedTasks: any[]) => {
    if (editingProject) {
      updateMutation.mutate(
        { id: editingProject.id, data: projectData },
        {
          onSuccess: async (updatedProject) => {
            if (stagedTasks.length > 0) {
              await syncProjectTasks(updatedProject.id, stagedTasks);
            }
            setEditingProject(null);
          },
        }
      );
    } else {
      createMutation.mutate(projectData, {
        onSuccess: async (newProject) => {
          if (stagedTasks.length > 0) {
            await syncProjectTasks(newProject.id, stagedTasks);
          }
        },
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSearchParams({ status: newStatus, search });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ status, search: e.target.value });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingProject(null);
  };

  const isLoading = !isAuthReady || projectsLoading || (isEmployee && loadingCurrentUser);

  if (isLoading) {
    return <ProjectsSkeletonLoader />;
  }

  if (isEmployee && !currentUser && userFetchErrorMsg) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-8 text-center text-red-500">
          <p>{userFetchErrorMsg}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 w-full pb-28">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {memberFilteredProjects.length} projects across all clients
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto"
                onClick={() => {
                  setEditingProject(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> New Project
              </Button>
            )}
          </div>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-full"
            placeholder="Search projects..."
            value={search}
            onChange={handleSearchChange}
            data-testid="project-search-input"
          />
        </div>

        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList className="bg-slate-100 overflow-x-auto flex-nowrap w-full justify-start scrollbar-hide">
            {["all", "active", "planning", "completed", "on-hold"].map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize text-xs sm:text-sm">
                {s.replace("-", " ")}{" "}
                <span className="ml-1 text-xs opacity-60">({counts[s as keyof typeof counts]})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {["all", "active", "planning", "completed", "on-hold"].map((s) => (
            <TabsContent key={s} value={s}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    users={displayUsers}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={() => setSelectedProject(project)}
                    canEdit={isAdmin}
                  />
                ))}
                {paginatedProjects.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3 text-center py-16 text-slate-400">
                    <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No {s !== "all" ? s : ""} projects found</p>
                    {isEmployee && (
                      <p className="text-xs mt-2 text-slate-500">
                        If you believe you should see projects, contact an admin.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="bg-white border rounded-lg px-3 py-2 shadow-sm mt-6 mb-10">
                  <div className="hidden sm:flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
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
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2.5 py-1 rounded-md text-xs ${currentPage === pageNum ? "bg-indigo-600 text-white" : "border hover:bg-gray-50"}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-1 text-xs">...</span>
                          <button onClick={() => setCurrentPage(totalPages)} className="px-2.5 py-1 rounded-md text-xs border hover:bg-gray-50">
                            {totalPages}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 border rounded-md disabled:opacity-40 hover:bg-gray-50 text-xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <div className="flex sm:hidden flex-col gap-2">
                    <p className="text-xs text-gray-400 text-center">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex-1 py-1.5 border rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex-1 py-1.5 border rounded-lg text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <ProjectFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          project={editingProject}
          users={displayUsers}
          existingTasks={
            editingProject
              ? (allTasks as ApiTask[])
                  .filter((t) => t.projectId === editingProject.id)
                  .map(mapApiTaskToLocalTask)
              : []
          }
          timesheets={timesheets}
          completedTaskIds={nonPendingTaskIds}
          onSave={handleSaveProject}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />

        <ProjectDetailsSheet
          project={selectedProject}
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          users={displayUsers}
          tasks={allTasks.map(mapApiTaskToLocalTask)}
          timesheets={timesheets}
          completedTaskIds={nonPendingTaskIds}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}