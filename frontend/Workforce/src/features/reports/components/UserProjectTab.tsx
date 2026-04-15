import { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/shared/components/ui/command';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import ExcelJS from 'exceljs';
import { exportToExcel, addTitle, addHeaderRow, autoSizeColumns } from '../utils/excelExport';
import type { User, ReportType, UserProjectRowDto, Project } from '../api/reportApi';
import { getMonthRange, getMonthFromDate, fetchProjects } from '../api/reportApi';

interface Option {
  value: string;
  label: string;
  searchValue?: string;
  [key: string]: any;
}

interface ReportRow {
  project: string;
  hours: number;
  percent: number;
  headcount: number;
  estimateHours: number;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  renderOption?: (option: Option) => React.ReactNode;
  showCheckmark?: boolean;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  renderOption,
  showCheckmark = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <span className="opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[var(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList className="max-h-50 overflow-auto">
            <CommandEmpty>No options found.</CommandEmpty>
            {options.map(option => (
              <CommandItem
                key={option.value}
                value={option.searchValue || option.label}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {renderOption ? (
                  renderOption(option)
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {showCheckmark && value === option.value && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Helper functions
const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDayBefore = (dateStr: string): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDayAfter = (dateStr: string): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface UserProjectTabProps {
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  users: User[];
  projects: Project[];
  isLoading: boolean;
  matrixData: UserProjectRowDto[];
  onApply?: () => void;
}

export function UserProjectTab({
  reportType,
  setReportType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedUserId,
  setSelectedUserId,
  selectedProjectId,
  setSelectedProjectId,
  users,
  projects: allProjects,
  isLoading,
  matrixData,
  onApply,
}: UserProjectTabProps) {
  const reportTypeOptions: Option[] = [
    { value: 'weekly', label: 'Weekly Report', searchValue: 'weekly' },
    { value: 'monthly', label: 'Monthly Report', searchValue: 'monthly' },
    { value: 'dateRange', label: 'Date Range', searchValue: 'date range' },
    { value: 'all', label: 'All Time', searchValue: 'all' },
  ];

  const userOptions: Option[] = [
    { value: '', label: 'All Employees', searchValue: 'All Employees' },
    ...users.map(user => ({
      value: user.id,
      label: user.name,
      searchValue: `${user.name} ${user.email}`,
      email: user.email,
    })),
  ];

  // Fetch projects filtered by selected user (if any)
  const { data: userProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projectsForUser', selectedUserId],
    queryFn: () => fetchProjects(undefined, undefined, selectedUserId || undefined),
    enabled: !!selectedUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Build project options based on selected user
  const projectOptions = useMemo(() => {
    const baseOptions: Option[] = [{ value: '', label: 'All Projects', searchValue: 'All Projects' }];
    let sourceProjects = allProjects;
    if (selectedUserId && userProjects.length > 0) {
      sourceProjects = userProjects;
    }
    sourceProjects.forEach(proj => {
      baseOptions.push({
        value: proj.id,
        label: proj.name,
        searchValue: proj.name,
      });
    });
    return baseOptions;
  }, [allProjects, userProjects, selectedUserId]);

  // Reset selected project when employee changes
  useEffect(() => {
    setSelectedProjectId('');
  }, [selectedUserId, setSelectedProjectId]);

  const renderUserOption = (option: Option) => {
    if (option.value === '') return option.label;
    return (
      <div className="flex flex-col">
        <span>{option.label}</span>
        <span className="text-xs text-muted-foreground">{option.email}</span>
      </div>
    );
  };

  const renderProjectOption = (option: Option) => {
    return (
      <div className="flex items-center justify-between w-full">
        <span>{option.label}</span>
        {selectedProjectId === option.value && (
          <Check className="ml-2 h-4 w-4 text-primary" />
        )}
      </div>
    );
  };

  const isRangeValid = () => {
    if (reportType === 'monthly') return true;
    if (reportType === 'dateRange') return startDate < endDate;
    return true;
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.currentTarget as HTMLInputElement).showPicker?.();
  };

  const handleMonthChange = (month: string) => {
    const { start, end } = getMonthRange(month);
    setStartDate(start);
    setEndDate(end);
  };

  // ✅ FIX: Aggregate hours per user + project (single entry per employee per project)
  const detailedGroupedData = useMemo(() => {
    // Map: userId -> Map(projectName -> { hours, plannedHours })
    const userMap = new Map<string, Map<string, { hours: number; plannedHours: number }>>();
    
    for (const row of matrixData) {
      let projectMap = userMap.get(row.userId);
      if (!projectMap) {
        projectMap = new Map();
        userMap.set(row.userId, projectMap);
      }
      
      const existing = projectMap.get(row.projectName);
      if (existing) {
        existing.hours += row.hours;
        // plannedHours should be same for same project, keep as is
      } else {
        projectMap.set(row.projectName, {
          hours: row.hours,
          plannedHours: row.plannedHours,
        });
      }
    }
    
    // Transform into display format
    const result: { userName: string; projects: { projectName: string; hours: number; percentOfEstimate: number }[] }[] = [];
    for (const [userId, projectMap] of userMap.entries()) {
      const userName = matrixData.find(r => r.userId === userId)?.userName || userId;
      const projects = Array.from(projectMap.entries()).map(([projectName, data]) => {
        const percentOfEstimate = data.plannedHours > 0 ? (data.hours / data.plannedHours) * 100 : 0;
        return {
          projectName,
          hours: data.hours,
          percentOfEstimate,
        };
      });
      result.push({ userName, projects });
    }
    return result;
  }, [matrixData]);

  // Aggregated project summary (one row per project) – unchanged, already correct
  const aggregatedData = useMemo(() => {
    const projectMap = new Map<string, { hours: number; plannedHours: number; headcount: number; users: Set<string> }>();
    matrixData.forEach(row => {
      const existing = projectMap.get(row.projectName);
      if (existing) {
        existing.hours += row.hours;
        existing.users.add(row.userId);
      } else {
        projectMap.set(row.projectName, {
          hours: row.hours,
          plannedHours: row.plannedHours,
          headcount: row.headcount,
          users: new Set([row.userId]),
        });
      }
    });

    const rows: ReportRow[] = [];
    for (const [projectName, { hours, plannedHours, headcount }] of projectMap.entries()) {
      const percent = plannedHours > 0 ? (hours / plannedHours) * 100 : 0;
      rows.push({
        project: projectName,
        hours,
        percent,
        headcount,
        estimateHours: plannedHours,
      });
    }
    return rows;
  }, [matrixData]);

  const handleExportToExcel = async () => {
    if (aggregatedData.length === 0 && detailedGroupedData.length === 0) {
      alert('No data to export');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee-Project Report');
    let currentRow = 1;

    // Project Summary table
    if (aggregatedData.length > 0) {
      addTitle(worksheet, 'Project Summary', `A${currentRow}`, `E${currentRow}`);
      currentRow++;
      addHeaderRow(worksheet, ['Project', 'Estimate Hours', 'Total Hours Logged', '% Total', 'Headcount'], currentRow);
      currentRow++;
      aggregatedData.forEach(row => {
        const wsRow = worksheet.getRow(currentRow);
        wsRow.getCell(1).value = row.project;
        wsRow.getCell(2).value = row.estimateHours;
        wsRow.getCell(3).value = row.hours;
        wsRow.getCell(4).value = `${Math.round(row.percent)}%`;
        wsRow.getCell(5).value = row.headcount;
        wsRow.getCell(2).alignment = { horizontal: 'right' };
        wsRow.getCell(3).alignment = { horizontal: 'right' };
        wsRow.getCell(4).alignment = { horizontal: 'right' };
        currentRow++;
      });
      currentRow++;
    }

    // Detailed Breakdown table (grouped by employee, one row per project)
    if (detailedGroupedData.length > 0) {
      addTitle(worksheet, 'Detailed Breakdown', `A${currentRow}`, `D${currentRow}`);
      currentRow++;
      addHeaderRow(worksheet, ['Employee', 'Project', 'Hours Logged', '% of Project Estimate'], currentRow);
      currentRow++;
      
      for (const user of detailedGroupedData) {
        const startRow = currentRow;
        for (let i = 0; i < user.projects.length; i++) {
          const proj = user.projects[i];
          const wsRow = worksheet.getRow(currentRow);
          if (i === 0) {
            wsRow.getCell(1).value = user.userName;
          }
          wsRow.getCell(2).value = proj.projectName;
          wsRow.getCell(3).value = proj.hours;
          wsRow.getCell(4).value = `${proj.percentOfEstimate.toFixed(1)}%`;
          wsRow.getCell(3).alignment = { horizontal: 'right' };
          wsRow.getCell(4).alignment = { horizontal: 'right' };
          currentRow++;
        }
        if (user.projects.length > 1) {
          worksheet.mergeCells(`A${startRow}:A${currentRow - 1}`);
          const mergedCell = worksheet.getCell(`A${startRow}`);
          mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      }
    }

    autoSizeColumns(worksheet, [25, 30, 15, 18]);
    await exportToExcel(workbook, `employee_project_report_${new Date().toISOString().slice(0, 19)}.xlsx`);
  };

  const today = getToday();
  const startMax = endDate ? getDayBefore(endDate) : today;
  const endMin = startDate ? getDayAfter(startDate) : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* Configuration Panel */}
      <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Report Detail</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Report Type</label>
            <SearchableSelect
              options={reportTypeOptions}
              value={reportType}
              onChange={(val) => setReportType(val as ReportType)}
              placeholder="Select report type"
              disabled={isLoading}
            />
          </div>

          {(reportType === 'monthly' || reportType === 'dateRange') && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {reportType === 'monthly' ? 'Month' : 'Date Range'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {reportType === 'monthly' ? (
                  <div className="col-span-2">
                    <input
                      type="month"
                      value={getMonthFromDate(startDate)}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      onClick={handleDateClick}
                      disabled={isLoading}
                      max={getMonthFromDate(today)}
                      className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-xs text-slate-500">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        onClick={handleDateClick}
                        disabled={isLoading}
                        max={startMax}
                        className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        onClick={handleDateClick}
                        disabled={isLoading}
                        min={endMin}
                        max={today}
                        className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </>
                )}
              </div>
              {reportType === 'dateRange' && !isRangeValid() && (
                <p className="text-xs text-red-500 mt-1">End date must be after start date.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Employee</label>
            <SearchableSelect
              options={userOptions}
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder="All Employees"
              disabled={isLoading}
              renderOption={renderUserOption}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Project</label>
            <SearchableSelect
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="All Projects"
              disabled={isLoading || (!!selectedUserId && loadingProjects)}
              renderOption={renderProjectOption}
              showCheckmark
            />
          </div>

          <button
            onClick={onApply}
            disabled={!isRangeValid()}
            className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 transition-colors mt-2 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[calc(100vh-250px)]">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800">Report Preview</h3>
            <p className="text-xs text-slate-500">Auto-updated based on filters</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportToExcel}
              className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              .XLSX
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Project Summary Table - Full Width */}
            <div className="overflow-x-auto rounded border border-slate-100">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 w-2/5">Project</th>
                    <th className="px-4 py-3 border-b border-slate-200 w-1/5">Estimate Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200 w-1/5">Total Hours Logged</th>
                    <th className="px-4 py-3 border-b border-slate-200 w-1/5">% Total</th>
                    <th className="px-4 py-3 border-b border-slate-200 w-1/5">Headcount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.project}</td>
                      <td className="px-4 py-3">{row.estimateHours}</td>
                      <td className="px-4 py-3">{row.hours}</td>
                      <td className="px-4 py-3">{Math.round(row.percent)}%</td>
                      <td className="px-4 py-3">{row.headcount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detailed Breakdown Table - Grouped by Employee, One Row Per Project */}
            {detailedGroupedData.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Detailed Breakdown</h4>
                <div className="overflow-x-auto rounded border border-slate-100">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 border-b border-slate-200 w-1/4">Employee</th>
                        <th className="px-4 py-3 border-b border-slate-200 w-2/5">Project</th>
                        <th className="px-4 py-3 border-b border-slate-200 w-1/5">Hours Logged</th>
                        <th className="px-4 py-3 border-b border-slate-200 w-1/5">% of Project Estimate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailedGroupedData.map((user) => {
                        const projectCount = user.projects.length;
                        return user.projects.map((proj, idx) => (
                          <tr key={`${user.userName}-${proj.projectName}`}>
                            {idx === 0 && (
                              <td
                                rowSpan={projectCount}
                                className="px-4 py-3 font-medium text-slate-800 align-top border-r bg-gray-50"
                              >
                                {user.userName}
                              </td>
                            )}
                            <td className="px-4 py-3">{proj.projectName}</td>
                            <td className="px-4 py-3">{proj.hours}</td>
                            <td className="px-4 py-3">{proj.percentOfEstimate.toFixed(1)}%</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}