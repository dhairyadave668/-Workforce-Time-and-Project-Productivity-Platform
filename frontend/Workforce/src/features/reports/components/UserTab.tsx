import { FileSpreadsheet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/shared/components/ui/command';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { exportToExcel, addTitle, addHeaderRow, autoSizeColumns } from '../utils/excelExport';
import type { User, ReportType, UserReportDto } from '../api/reportApi';
import { getMonthRange, getMonthFromDate } from '../api/reportApi';

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

interface UserTabProps {
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  users: User[];
  reportData: UserReportDto[];
  isLoading: boolean;
  onApply?: () => void;
}

export function UserTab({
  reportType,
  setReportType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedUserId,
  setSelectedUserId,
  users,
  reportData,
  isLoading,
  onApply,
}: UserTabProps) {
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

  const renderUserOption = (option: Option) => {
    if (option.value === '') return option.label;
    return (
      <div className="flex flex-col">
        <span>{option.label}</span>
        <span className="text-xs text-muted-foreground">{option.email}</span>
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

  // Prepare grouped data for display
  const groupedData = useMemo(() => {
    if (selectedUserId !== '') {
      // Single user selected – show list of projects
      const user = reportData.find(u => u.userId === selectedUserId);
      if (!user) return { type: 'single', data: [] };
      return {
        type: 'single',
        data: user.projects.map(p => ({
          project: p.projectName,
          estimateHours: p.plannedHours,
          loggedHours: p.loggedHours,
          percentage: p.percentComplete,
        })),
      };
    } else {
      // All users – group by user
      const grouped: { user: string; projects: any[] }[] = [];
      reportData.forEach(u => {
        grouped.push({
          user: u.userName,
          projects: u.projects.map(p => ({
            project: p.projectName,
            estimateHours: p.plannedHours,
            loggedHours: p.loggedHours,
            percentage: p.percentComplete,
          })),
        });
      });
      return { type: 'grouped', data: grouped };
    }
  }, [reportData, selectedUserId]);

  const handleExportToExcel = async () => {
    if (groupedData.type === 'grouped' && groupedData.data.length === 0) {
      alert('No data to export');
      return;
    }
    if (groupedData.type === 'single' && groupedData.data.length === 0) {
      alert('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee Project Breakdown');

    if (groupedData.type === 'grouped') {
      // All employees grouped
      addTitle(worksheet, 'All Employees – Project Hours Breakdown', 'A1', 'E1');
      addHeaderRow(worksheet, ['Employee', 'Project', 'Estimate Hours', 'Logged Hours', '% of Project Estimate'], 2);

      let currentRow = 3;
      for (const userGroup of groupedData.data as { user: string; projects: any[] }[]) {
        const startRow = currentRow;
        for (let i = 0; i < userGroup.projects.length; i++) {
          const project = userGroup.projects[i];
          const row = worksheet.getRow(currentRow);
          if (i === 0) {
            row.getCell(1).value = userGroup.user;
          }
          row.getCell(2).value = project.project;
          row.getCell(3).value = project.estimateHours;
          row.getCell(4).value = project.loggedHours;
          row.getCell(5).value = `${project.percentage.toFixed(1)}%`;
          row.getCell(3).alignment = { horizontal: 'right' };
          row.getCell(4).alignment = { horizontal: 'right' };
          row.getCell(5).alignment = { horizontal: 'right' };
          currentRow++;
        }
        if (userGroup.projects.length > 1) {
          worksheet.mergeCells(`A${startRow}:A${currentRow - 1}`);
          const mergedCell = worksheet.getCell(`A${startRow}`);
          mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      }
      autoSizeColumns(worksheet, [25, 30, 15, 15, 20]);
      await exportToExcel(workbook, `all_employees_report_${new Date().toISOString().slice(0, 19)}.xlsx`);
    } else {
      // Single employee
      const employeeName = users.find(u => u.id === selectedUserId)?.name || 'Employee';
      addTitle(worksheet, `Project Summary for ${employeeName}`, 'A1', 'D1');
      addHeaderRow(worksheet, ['Project', 'Estimate Hours', 'Total Hours Logged', '% Total'], 2);

      (groupedData.data as any[]).forEach((row, idx) => {
        const wsRow = worksheet.getRow(3 + idx);
        wsRow.getCell(1).value = row.project;
        wsRow.getCell(2).value = row.estimateHours;
        wsRow.getCell(3).value = row.loggedHours;
        wsRow.getCell(4).value = `${row.percentage.toFixed(1)}%`;
        wsRow.getCell(2).alignment = { horizontal: 'right' };
        wsRow.getCell(3).alignment = { horizontal: 'right' };
        wsRow.getCell(4).alignment = { horizontal: 'right' };
      });
      autoSizeColumns(worksheet, [30, 18, 18, 15]);
      await exportToExcel(workbook, `employee_report_${new Date().toISOString().slice(0, 19)}.xlsx`);
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
              {selectedUserId === ''
                ? 'Detailed breakdown of all employees per project'
                : 'Project summary for selected employee'}
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

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : selectedUserId === '' ? (
          groupedData.type === 'grouped' && groupedData.data.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data for selected filters.</div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-100">
              <table className="min-w-max text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Employee</th>
                    <th className="px-4 py-3 border-b border-slate-200">Project</th>
                    <th className="px-4 py-3 border-b border-slate-200">Estimate Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200">Logged Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200">% of Project Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(groupedData.data as { user: string; projects: any[] }[]).map((userGroup) => {
                    const projects = userGroup.projects;
                    return projects.map((project, idx) => (
                      <tr key={`${userGroup.user}-${idx}`}>
                        {idx === 0 && (
                          <td rowSpan={projects.length} className="px-4 py-3 font-medium text-slate-800 align-top border-r">
                            {userGroup.user}
                          </td>
                        )}
                        <td className="px-4 py-3">{project.project}</td>
                        <td className="px-4 py-3">{project.estimateHours}</td>
                        <td className="px-4 py-3">{project.loggedHours}</td>
                        <td className="px-4 py-3">{project.percentage.toFixed(1)}%</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          groupedData.type === 'single' && groupedData.data.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No data for selected filters.</div>
          ) : (
            <div className="overflow-x-auto rounded border border-slate-100">
              <table className="min-w-max text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">Project</th>
                    <th className="px-4 py-3 border-b border-slate-200">Estimate Hours</th>
                    <th className="px-4 py-3 border-b border-slate-200">Total Hours Logged</th>
                    <th className="px-4 py-3 border-b border-slate-200">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(groupedData.data as any[]).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.project}</td>
                      <td className="px-4 py-3">{row.estimateHours}</td>
                      <td className="px-4 py-3">{row.loggedHours}</td>
                      <td className="px-4 py-3">{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}