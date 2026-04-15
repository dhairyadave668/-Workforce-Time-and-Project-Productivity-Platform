using Workforce.Features.Timesheets.DTOs;
using Workforce.Features.Timesheets.Entities;

namespace Workforce.Features.Timesheets.Services;

public interface IDailyTimesheetService
{
    Task<List<TimesheetEntryResponseDto>> GetAll(bool excludePending = false);

    // ✅ ADDED: matches original signature – returns raw entities
    Task<List<TimesheetEntry>> GetAll();

    Task CreateDailyTimesheet(CreateDailyTimesheetDto dto);
    Task<List<TimesheetHistoryDto>> GetHistory();
    Task<List<TimesheetHistoryDto>> GetHistoryByEntraId(string entraId);
    Task<List<TimesheetEntry>> GetAllByEntraId(string entraId);
    Task<double> GetCurrentWeekHours(string entraId);
    Task<int> GetAdminRemarksCount(string entraId);
    Task<List<object>> GetMonthlyHours(string entraId);
}