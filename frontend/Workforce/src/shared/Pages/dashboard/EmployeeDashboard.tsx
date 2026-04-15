import { useEffect, useState } from "react";
import {
  Clock,
  AlertTriangle,
  FolderKanban,
} from "lucide-react";
import MainLayout from "@/shared/components/layout/MainLayout";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";

import {
  fetchProjectCount,
  fetchWeeklyHours,
  fetchRemarksCount,
  fetchRemarksList,
} from "../../api/Employeedashboardapi";

import type { ActivityItem } from "../../api/Employeedashboardapi";

const StatSkeleton = () => (
  <div className="bg-white p-5 rounded-xl shadow">
    <div className="flex justify-between">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="h-9 w-20 bg-gray-200 rounded mt-3 animate-pulse"></div>
    <div className="mt-4 w-full bg-gray-200 h-2 rounded">
      <div className="bg-gray-300 h-2 rounded w-0"></div>
    </div>
    <div className="h-3 w-32 bg-gray-200 rounded mt-2 animate-pulse"></div>
  </div>
);

const RemarksSkeleton = () => (
  <div className="bg-white p-5 rounded-xl shadow">
    <div className="flex justify-between">
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="h-9 w-12 bg-gray-200 rounded mt-3 animate-pulse"></div>
    <div className="h-3 w-24 bg-gray-200 rounded mt-2 animate-pulse"></div>
  </div>
);

const RemarksListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white p-5 rounded-xl shadow border">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded mt-2 animate-pulse"></div>
      </div>
    ))}
  </div>
);

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { entraId, name } = useAuth();

  const [remarksList, setRemarksList] = useState<ActivityItem[]>([]);
  const [remarksCount, setRemarksCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  const [remarkPage, setRemarkPage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entraId) return;

    const loadData = async () => {
      const projects = await fetchProjectCount(entraId);
      const hours = await fetchWeeklyHours(entraId);
      const remarksCountData = await fetchRemarksCount(entraId);
      const remarksData = await fetchRemarksList(entraId);

      setProjectCount(projects);
      setWeeklyHours(hours);
      setRemarksCount(remarksCountData);
      setRemarksList(remarksData);
      setLoading(false);
    };

    loadData();
  }, [entraId]);

  const progress = Math.min((weeklyHours / 40) * 100, 100);

  return (
    <>
      <MainLayout>
        <div className="p-6 space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-2xl font-semibold">Hi! {name || "User"} 👋</h1>
            <p className="text-gray-500">
              Here's your timesheet overview for this week.
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? (
              <>
                <StatSkeleton />
                <RemarksSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                {/* HOURS */}
                <div className="bg-white p-5 rounded-xl shadow">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Hours This Week</span>
                    <Clock size={18} />
                  </div>
                  <h2 className="text-3xl font-bold mt-3">
                    {weeklyHours} / 40
                  </h2>
                  <div className="mt-4 w-full bg-gray-200 h-2 rounded">
                    <div
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {progress.toFixed(0)}% completed
                  </p>
                </div>

                {/* REMARKS */}
                <div
                  onClick={() => setRemarkPage(true)}
                  className="bg-white p-5 rounded-xl shadow cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Remarks</span>
                    <AlertTriangle size={16} />
                  </div>
                  <h2 className="text-3xl font-bold mt-3">{remarksCount}</h2>
                  <p className="text-xs text-gray-400 mt-2">by Admin</p>
                </div>

                {/* ASSIGNED PROJECTS */}
                <div
                  onClick={() => navigate("/projects")}
                  className="bg-white p-5 rounded-xl shadow cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Assigned Projects</span>
                    <FolderKanban size={18} />
                  </div>
                  <h2 className="text-3xl font-bold mt-3">{projectCount}</h2>
                  <p className="text-xs text-gray-400 mt-2">total assigned</p>
                </div>
              </>
            )}
          </div>

          {/* REMARK PAGE (modal) */}
          {remarkPage && (
            <div className="fixed inset-0 z-9999 bg-gray-50 overflow-auto">
              <MainLayout>
                <div className="min-h-screen p-4 sm:p-8">
                  <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold">
                        Admin Remarks
                      </h1>
                      <p className="text-gray-500 text-sm">
                        Review feedback from admin
                      </p>
                    </div>
                    <button
                      onClick={() => setRemarkPage(false)}
                      className="px-5 py-2 border rounded-lg bg-white hover:bg-gray-100"
                    >
                      ← Back
                    </button>
                  </div>
                  <div className="max-w-6xl mx-auto">
                    {loading ? (
                      <RemarksListSkeleton />
                    ) : remarksList.length === 0 ? (
                      <div className="bg-white p-10 text-center rounded-xl shadow">
                        No remarks available
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        {remarksList.map((r) => (
                          <div
                            key={r.id}
                            className="bg-white p-5 rounded-xl shadow border"
                          >
                            <div className="flex justify-between text-sm text-gray-500 mb-2">
                              <span>{new Date(r.entryDate).toDateString()}</span>
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-600">
                                {r.status}
                              </span>
                            </div>
                            <p className="text-gray-800">
                              {r.adminRemarks || "No remarks"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </MainLayout>
            </div>
          )}

        </div>
      </MainLayout>
    </>
  );
}