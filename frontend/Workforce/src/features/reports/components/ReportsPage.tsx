import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { fetchProjects } from '../api/reportApi';
import {
  fetchUsers,
  fetchProjectSummary,
  fetchUserSummary,
  fetchUserProjectMatrix,
  formatLocalDate,
  getCurrentWeekRange,
} from '../api/reportApi';
import type { ReportType, Project } from '../api/reportApi'; // ✅ Added Project type
import MainLayout from '@/shared/components/layout/MainLayout';
import { UserTab } from './UserTab';
import { ProjectTab } from './ProjectTab';
import { UserProjectTab } from './UserProjectTab';

// Skeleton components (unchanged)
function SkeletonCell({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />;
}

function ReportsSkeletonLoader() {
  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-40">
        <div className="flex gap-2 border-b pb-2">
          {[1, 2, 3].map((i) => (
            <SkeletonCell key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Left panel skeleton */}
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <SkeletonCell className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              <div>
                <SkeletonCell className="h-3 w-20 mb-1" />
                <SkeletonCell className="h-10 w-full rounded-md" />
              </div>
              <div>
                <SkeletonCell className="h-3 w-24 mb-1" />
                <div className="grid grid-cols-2 gap-2">
                  <SkeletonCell className="h-10 rounded-md" />
                  <SkeletonCell className="h-10 rounded-md" />
                </div>
              </div>
              <div>
                <SkeletonCell className="h-3 w-28 mb-1" />
                <SkeletonCell className="h-10 w-full rounded-md" />
              </div>
              <SkeletonCell className="h-10 w-full rounded-lg mt-2" />
            </div>
          </div>
          {/* Right panel skeleton */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[calc(100vh-250px)]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <SkeletonCell className="h-5 w-28 mb-1" />
                <SkeletonCell className="h-3 w-40" />
              </div>
              <SkeletonCell className="h-8 w-16 rounded" />
            </div>
            <div className="overflow-hidden rounded border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3"><SkeletonCell className="h-3 w-20" /></th>
                    <th className="px-4 py-3"><SkeletonCell className="h-3 w-24" /></th>
                    <th className="px-4 py-3"><SkeletonCell className="h-3 w-24" /></th>
                    <th className="px-4 py-3"><SkeletonCell className="h-3 w-16" /></th>
                    <th className="px-4 py-3"><SkeletonCell className="h-3 w-20" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3"><SkeletonCell className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><SkeletonCell className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><SkeletonCell className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><SkeletonCell className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><SkeletonCell className="h-4 w-12" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Helper: get first and last day of current month as YYYY-MM-DD (local time)
const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
};

export default function ReportsPage() {
  // Fetch users (needed for dropdowns)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // ✅ Fixed: wrapped fetchProjects with arrow function and added generic type
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
    staleTime: 5 * 60 * 1000,
  });

  const currentMonth = getCurrentMonthRange();

  // ==================== Employee Tab ====================
  const [userReportType, setUserReportType] = useState<ReportType>('monthly');
  const [userStartDate, setUserStartDate] = useState(currentMonth.start);
  const [userEndDate, setUserEndDate] = useState(currentMonth.end);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userFiltersTrigger, setUserFiltersTrigger] = useState(0);
  const applyUserFilters = () => setUserFiltersTrigger(prev => prev + 1);

  const userEffectiveDates = useMemo(() => {
    if (userReportType === 'all') return { start: undefined, end: undefined };
    if (userReportType === 'weekly') {
      const { weekStart, weekEnd } = getCurrentWeekRange();
      return { start: weekStart, end: weekEnd };
    }
    return { start: userStartDate, end: userEndDate };
  }, [userReportType, userStartDate, userEndDate]);

  const { data: userReportData = [], isLoading: userReportLoading } = useQuery({
    queryKey: ['userSummary', selectedUserId, userEffectiveDates.start, userEffectiveDates.end, userFiltersTrigger],
    queryFn: () => fetchUserSummary(selectedUserId || undefined, userEffectiveDates.start, userEffectiveDates.end),
    staleTime: 2 * 60 * 1000,
  });

  // ==================== Project Tab ====================
  const [projectReportType, setProjectReportType] = useState<ReportType>('monthly');
  const [projectStartDate, setProjectStartDate] = useState(currentMonth.start);
  const [projectEndDate, setProjectEndDate] = useState(currentMonth.end);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectFiltersTrigger, setProjectFiltersTrigger] = useState(0);
  const applyProjectFilters = () => setProjectFiltersTrigger(prev => prev + 1);

  const projectEffectiveDates = useMemo(() => {
    if (projectReportType === 'all') return { start: undefined, end: undefined };
    if (projectReportType === 'weekly') {
      const { weekStart, weekEnd } = getCurrentWeekRange();
      return { start: weekStart, end: weekEnd };
    }
    return { start: projectStartDate, end: projectEndDate };
  }, [projectReportType, projectStartDate, projectEndDate]);

  const { data: projectSummaryData = [], isLoading: projectSummaryLoading } = useQuery({
    queryKey: ['projectSummary', projectEffectiveDates.start, projectEffectiveDates.end, projectFiltersTrigger],
    queryFn: () => fetchProjectSummary(projectEffectiveDates.start, projectEffectiveDates.end),
    staleTime: 2 * 60 * 1000,
  });

  const projectTabReportData = useMemo(() => {
    return projectSummaryData.map(p => ({
      project: p.projectName,
      hours: p.loggedHours,
      percent: p.percentComplete,
      headcount: p.headcount,
      estimateHours: p.plannedHours,
    }));
  }, [projectSummaryData]);

  // ==================== User-Project Tab ====================
  const [upReportType, setUpReportType] = useState<ReportType>('monthly');
  const [upStartDate, setUpStartDate] = useState(currentMonth.start);
  const [upEndDate, setUpEndDate] = useState(currentMonth.end);
  const [upSelectedUserId, setUpSelectedUserId] = useState('');
  const [upSelectedProjectId, setUpSelectedProjectId] = useState('');
  const [upFiltersTrigger, setUpFiltersTrigger] = useState(0);
  const applyUpFilters = () => setUpFiltersTrigger(prev => prev + 1);

  const upEffectiveDates = useMemo(() => {
    if (upReportType === 'all') return { start: undefined, end: undefined };
    if (upReportType === 'weekly') {
      const { weekStart, weekEnd } = getCurrentWeekRange();
      return { start: weekStart, end: weekEnd };
    }
    return { start: upStartDate, end: upEndDate };
  }, [upReportType, upStartDate, upEndDate]);

  const { data: userProjectMatrix = [], isLoading: userProjectMatrixLoading } = useQuery({
    queryKey: [
      'userProjectMatrix',
      upSelectedUserId || undefined,
      upSelectedProjectId || undefined,
      upEffectiveDates.start,
      upEffectiveDates.end,
      upFiltersTrigger,
    ],
    queryFn: () => fetchUserProjectMatrix(upSelectedUserId || undefined, upSelectedProjectId || undefined, upEffectiveDates.start, upEffectiveDates.end),
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = usersLoading;

  if (isLoading) {
    return <ReportsSkeletonLoader />;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-40">
        <Tabs defaultValue="employee">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="employee">Employee</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="employee-project">Employee-Project</TabsTrigger>
          </TabsList>

          <TabsContent value="employee" className="mt-6">
            <UserTab
              reportType={userReportType}
              setReportType={setUserReportType}
              startDate={userStartDate}
              setStartDate={setUserStartDate}
              endDate={userEndDate}
              setEndDate={setUserEndDate}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              users={users}
              reportData={userReportData}
              isLoading={userReportLoading}
              onApply={applyUserFilters}
            />
          </TabsContent>

          <TabsContent value="project" className="mt-6">
            <ProjectTab
              reportType={projectReportType}
              setReportType={setProjectReportType}
              startDate={projectStartDate}
              setStartDate={setProjectStartDate}
              endDate={projectEndDate}
              setEndDate={setProjectEndDate}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              isLoading={projectSummaryLoading}
              reportData={projectTabReportData}
              onApply={applyProjectFilters}
              projects={projects}
              filtersTrigger={projectFiltersTrigger}
            />
          </TabsContent>

          <TabsContent value="employee-project" className="mt-6">
            <UserProjectTab
              reportType={upReportType}
              setReportType={setUpReportType}
              startDate={upStartDate}
              setStartDate={setUpStartDate}
              endDate={upEndDate}
              setEndDate={setUpEndDate}
              selectedUserId={upSelectedUserId}
              setSelectedUserId={setUpSelectedUserId}
              selectedProjectId={upSelectedProjectId}
              setSelectedProjectId={setUpSelectedProjectId}
              users={users}
              isLoading={userProjectMatrixLoading}
              matrixData={userProjectMatrix}
              projects={projects}
              onApply={applyUpFilters}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}