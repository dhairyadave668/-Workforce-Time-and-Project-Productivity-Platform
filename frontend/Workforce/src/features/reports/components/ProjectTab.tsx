import { FileSpreadsheet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/shared/components/ui/command';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ExcelJS from 'exceljs';
import { exportToExcel, addTitle, addHeaderRow, autoSizeColumns } from '../utils/excelExport';
import type {  ReportType, Project} from '../api/reportApi';
import { getCurrentWeekRange, getMonthRange, getMonthFromDate, fetchProjectBreakdown } from '../api/reportApi';

// Types
interface ReportRow {
  project: string;
  hours: number;
  percent: number;
  headcount: number;
  estimateHours: number;
}

interface Option {
  value: string;
  label: string;
  searchValue?: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  renderOption?: (option: Option) => React.ReactNode;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  renderOption,
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
                {renderOption ? renderOption(option) : option.label}
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

interface ProjectTabProps {
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  projects: Project[];
  isLoading: boolean;
  reportData: ReportRow[];
  onApply?: () => void;
  filtersTrigger?: number;
}

export function ProjectTab({
  reportType,
  setReportType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  isLoading,
  reportData,
  onApply,
  filtersTrigger,
}: ProjectTabProps) {
  const reportTypeOptions: Option[] = [
    { value: 'weekly', label: 'Weekly Report', searchValue: 'weekly' },
    { value: 'monthly', label: 'Monthly Report', searchValue: 'monthly' },
    { value: 'dateRange', label: 'Date Range', searchValue: 'date range' },
    { value: 'all', label: 'All Time', searchValue: 'all' },
  ];

  const projectOptions = useMemo(() => {
    const options: Option[] = [{ value: '', label: 'All Projects', searchValue: 'All Projects' }];
    projects.forEach(proj => {
      options.push({
        value: proj.id,
        label: proj.name,
        searchValue: proj.name,
      });
    });
    return options;
  }, [projects]);

  const isRangeValid = () => {
    if (reportType === 'monthly') return true;
    if (reportType === 'dateRange') return startDate < endDate;
    return true;
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.currentTarget as HTMLInputElement).showPicker?.();
  };

  // ✅ Unify effective dates: always return { start, end }
  const effectiveDates = useMemo(() => {
    if (reportType === 'all') return { start: undefined, end: undefined };
    if (reportType === 'weekly') {
      const { weekStart, weekEnd } = getCurrentWeekRange();
      return { start: weekStart, end: weekEnd };
    }
    return { start: startDate, end: endDate };
  }, [reportType, startDate, endDate]);

  const { data: breakdownData = [], isLoading: breakdownLoading } = useQuery({
    queryKey: ['projectBreakdown', selectedProjectId, effectiveDates.start, effectiveDates.end, filtersTrigger],
    queryFn: () => fetchProjectBreakdown(selectedProjectId, effectiveDates.start, effectiveDates.end),
    enabled: !!selectedProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const userProjectHours = useMemo(() => {
    return breakdownData.map(item => ({
      userName: item.userName,
      loggedHours: item.loggedHours,
      percentage: item.percentComplete,
      estimateHours: item.plannedHours,
    }));
  }, [breakdownData]);

  const totalProjectHours = useMemo(() => {
    return breakdownData.reduce((sum, item) => sum + item.loggedHours, 0);
  }, [breakdownData]);

  const totalPercentage = useMemo(() => {
    const planned = breakdownData[0]?.plannedHours ?? 0;
    return planned > 0 ? (totalProjectHours / planned) * 100 : 0;
  }, [breakdownData, totalProjectHours]);

  const displaySummaryData = reportData;
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleExportToExcel = async () => {
    if (selectedProjectId) {
      if (userProjectHours.length === 0) {
        alert('No data to export');
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employee Breakdown');
      addTitle(worksheet, 'Employee Hours Breakdown', 'A1', 'C1');
      addHeaderRow(worksheet, ['Employee', 'Logged Hours', '% of Project Estimate'], 2);
      userProjectHours.forEach((item, idx) => {
        const row = worksheet.getRow(3 + idx);
        row.getCell(1).value = item.userName;
        row.getCell(2).value = item.loggedHours;
        row.getCell(3).value = `${Math.round(item.percentage)}%`;
        row.getCell(2).alignment = { horizontal: 'right' };
        row.getCell(3).alignment = { horizontal: 'right' };
      });
      autoSizeColumns(worksheet, [25, 15, 20]);
      await exportToExcel(workbook, `project_${selectedProjectId}_breakdown_${new Date().toISOString().slice(0, 19)}.xlsx`);
    } else {
      if (displaySummaryData.length === 0) {
        alert('No data to export');
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Project Summary');
      addTitle(worksheet, 'Project Summary Report', 'A1', 'E1');
      addHeaderRow(worksheet, ['Project', 'Estimate Hours', 'Total Hours Logged', '% of Project Estimate', 'Headcount'], 2);
      displaySummaryData.forEach((row, idx) => {
        const wsRow = worksheet.getRow(3 + idx);
        wsRow.getCell(1).value = row.project;
        wsRow.getCell(2).value = row.estimateHours;
        wsRow.getCell(3).value = row.hours;
        wsRow.getCell(4).value = `${Math.round(row.percent)}%`;
        wsRow.getCell(5).value = row.headcount;
        wsRow.getCell(2).alignment = { horizontal: 'right' };
        wsRow.getCell(3).alignment = { horizontal: 'right' };
        wsRow.getCell(4).alignment = { horizontal: 'right' };
      });
      autoSizeColumns(worksheet, [30, 15, 18, 18, 12]);
      await exportToExcel(workbook, `project_summary_${new Date().toISOString().slice(0, 19)}.xlsx`);
    }
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
                      onChange={(e) => {
                        const { start, end } = getMonthRange(e.target.value);
                        setStartDate(start);
                        setEndDate(end);
                      }}
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Project</label>
            <SearchableSelect
              options={projectOptions}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="All Projects"
              disabled={isLoading}
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
            <p className="text-xs text-slate-500">
              {selectedProjectId ? 'Employee Hours Breakdown' : 'Project Hours Summary'}
            </p>
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

        {isLoading || (selectedProjectId && breakdownLoading) ? (
          <div className="text-center py-8">Loading...</div>
        ) : selectedProjectId ? (
          userProjectHours.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No members assigned or no logged hours found.</div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-100">
              <table className="min-w-max text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-200">Estimate Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200">Logged Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200">% of Project Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userProjectHours.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.userName}</td>
                      <td className="px-4 py-3">{item.estimateHours}</td>
                      <td className="px-4 py-3">{item.loggedHours}</td>
                      <td className="px-4 py-3">{Math.round(item.percentage)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3">{selectedProject?.plannedHours ?? 0}</td>
                    <td className="px-4 py-3">{totalProjectHours}</td>
                    <td className="px-4 py-3">{Math.round(totalPercentage)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        ) : displaySummaryData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No data for selected filters.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-100">
            <table className="min-w-max text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200">Project</th>
                  <th className="px-4 py-3 border-b border-slate-200">Estimate Hours</th>
                  <th className="px-4 py-3 border-b border-slate-200">Total Hours Logged</th>
                  <th className="px-4 py-3 border-b border-slate-200">% of Project Estimate</th>
                  <th className="px-4 py-3 border-b border-slate-200">Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySummaryData.map((row, idx) => (
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
        )}
      </div>
    </div>
  );
}