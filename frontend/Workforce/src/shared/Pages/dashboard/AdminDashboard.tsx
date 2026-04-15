import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../components/layout/MainLayout";
import GlobalError from "../../components/GlobalError";

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";

import { Users, FolderKanban, Clock, MessageSquare } from "lucide-react";

import {
  fetchUsers,
  fetchProjects,
  fetchRemarksCount,
} from "../../api/AdmindashboardApi";

// ================= SKELETON =================
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className || ""}`} />
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white p-5 rounded-2xl border flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
    ))}
  </div>
);

const UsersListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

const ProjectsListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>
    ))}
  </div>
);

// ================= STATUS =================
const statusFromBackend: Record<string, string> = {
  Active: "active",
  Planning: "planning",
  OnHold: "on-hold",
  Completed: "completed",
};

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Active", class: "bg-emerald-50 text-emerald-700 cursor-default" },
  planning: { label: "Planning", class: "bg-blue-50 text-blue-700" },
  "on-hold": { label: "On Hold", class: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", class: "bg-slate-100 text-slate-700" },
};

export default function Admin() {
  const navigate = useNavigate();

  // ================= QUERIES =================
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    retry: false,
  });

  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    retry: false,
  });

  const {
    data: remarksCount = 0,
    isLoading: remarksLoading,
    error: remarksError,
  } = useQuery({
    queryKey: ["remarks-count"],
    queryFn: fetchRemarksCount,
    retry: false,
  });

  // ================= GLOBAL STATE =================
  const isLoading = usersLoading || projectsLoading || remarksLoading;
  const error = usersError || projectsError || remarksError;

  // 🔥 ERROR FIRST (MOST IMPORTANT)
  if (error) {
    return (
      <GlobalError
        message={(error as Error)?.message || "Failed to load dashboard"}
      />
    );
  }

  // 🔥 LOADING SECOND
  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <StatsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UsersListSkeleton />
            <ProjectsListSkeleton />
          </div>
        </div>
      </MainLayout>
    );
  }

  // ================= HELPERS =================
  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const topUsers = users.slice(0, 4);
  const topProjects = projects.slice(0, 3);

  const activeProjects = projects.filter(
    p =>
      statusFromBackend[p.status] === "active" ||
      p.status.toLowerCase() === "active"
  ).length;

  // ================= UI =================
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            onClick={() => navigate("/usermanager")}
            className="bg-white p-5 rounded-2xl border flex justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs text-gray-400">USERS</p>
              <p className="text-2xl font-semibold">{users.length}</p>
            </div>
            <Users className="w-6 h-6 text-indigo-500" />
          </div>

          <div
            onClick={() => navigate("/projects")}
            className="bg-white p-5 rounded-2xl border flex justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs text-gray-400">ACTIVE PROJECTS</p>
              <p className="text-2xl font-semibold">{activeProjects}</p>
            </div>
            <FolderKanban className="w-6 h-6 text-blue-500" />
          </div>

          <div
            onClick={() => navigate("/approvals")}
            className="bg-white p-5 rounded-2xl border flex justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs text-gray-400">REMARKS</p>
              <p className="text-2xl font-semibold">{remarksCount}</p>
            </div>
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>

          <div className="bg-white p-5 rounded-2xl border flex justify-between">
            <div>
              <p className="text-xs text-gray-400">HOURS</p>
              <p className="text-2xl font-semibold">110</p>
            </div>
            <Clock className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* USERS */}
          <div className="bg-white p-6 rounded-2xl border">
            <div className="flex justify-between mb-4">
              <h2 className="text-sm font-semibold flex gap-2 items-center">
                <Users className="w-4 h-4 text-gray-500" />
                Users
              </h2>
              <Link to="/usermanager" className="text-xs text-indigo-600">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {topUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => navigate(`/usermanager/${user.id}`)}
                >
                  <Avatar className="w-10 h-10 bg-indigo-100 text-indigo-600">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PROJECTS */}
          <div className="bg-white p-6 rounded-2xl border">
            <div className="flex justify-between mb-4">
              <h2 className="text-sm font-semibold flex gap-2 items-center">
                <FolderKanban className="w-4 h-4 text-gray-500" />
                Projects
              </h2>
              <Link to="/projects" className="text-xs text-indigo-600">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {topProjects.map(project => {
                const status =
                  statusFromBackend[project.status] ||
                  project.status.toLowerCase();

                const cfg = statusConfig[status];

                const progress =
                  project.plannedHours > 0
                    ? Math.min(
                        (project.loggedHrs / project.plannedHours) * 100,
                        100
                      )
                    : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects`)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-gray-400">{project.client}</p>
                      </div>

                      <Badge className={cn("text-[10px]", cfg.class)}>
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>
                        {project.loggedHrs}/{project.plannedHours} hrs
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>

                    <Progress value={progress} className="h-1.5 mt-1" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}