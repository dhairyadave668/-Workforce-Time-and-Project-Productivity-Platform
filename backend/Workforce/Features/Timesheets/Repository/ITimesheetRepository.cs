using Workforce.Features.Timesheets.Entities;

namespace Workforce.Features.Timesheets.Repository;

public interface ITimesheetRepository
{
    // Approval related
    Task<List<TimesheetEntry>> GetApprovalEntriesAsync();
    Task<List<DailyTimesheet>> GetDailyTimesheetsByIdAndDateAsync(Guid timesheetId, DateTime? entryDate);
    Task<int> GetTotalRemarksCountAsync();

    // DailyTimesheetService related
    Task<List<TimesheetEntry>> GetTimesheetEntriesAsync(bool excludePending);
    Task<DailyTimesheet?> GetDailyTimesheetByUserAndDateAsync(Guid userId, DateTime date);
    Task<List<TimesheetEntry>> GetTimesheetEntriesByUserAndDateAsync(Guid userId, DateTime date);
    Task AddDailyTimesheetAsync(DailyTimesheet daily);
    Task AddTimesheetEntryAsync(TimesheetEntry entry);
    void UpdateDailyTimesheet(DailyTimesheet daily);
    void RemoveTimesheetEntriesRange(IEnumerable<TimesheetEntry> entries);
    Task<List<DailyTimesheet>> GetAllDailyTimesheetsAsync();
    Task<List<DailyTimesheet>> GetDailyTimesheetsByUserIdAsync(Guid userId);
    Task<List<TimesheetEntry>> GetTimesheetEntriesByUserIdAsync(Guid userId);
    Task<decimal> GetCurrentWeekHoursAsync(Guid userId, DateTime startOfWeek, DateTime endOfWeek);
    Task<int> GetAdminRemarksCountForWeekAsync(Guid userId, DateTime startOfWeek, DateTime endOfWeek);
    Task<List<DailyTimesheetGroup>> GetMonthlyHoursGroupedAsync(Guid userId);
    Task<List<TimesheetEntry>> GetAllTimesheetEntriesAsync();

    // ✅ NEW: For logged hours calculation
    Task<List<TimesheetEntry>> GetTimesheetEntriesByProjectIdsAsync(List<Guid> projectIds);

    Task SaveChangesAsync();
    // ✅ NEW for reports
    Task<Dictionary<Guid, decimal>> GetLoggedHoursGroupedByProjectAsync(
        List<Guid> projectIds,
        DateTime? startDate,
        DateTime? endDate,
        bool onlyNonPendingTasks = true);

    Task<Dictionary<Guid, Dictionary<Guid, decimal>>> GetUserProjectHoursGroupedAsync(
        DateTime? startDate,
        DateTime? endDate,
        List<Guid>? userIds = null,
        List<Guid>? projectIds = null);

    Task<Dictionary<Guid, decimal>> GetLoggedHoursByUserForProjectAsync(
        Guid projectId,
        DateTime? startDate,
        DateTime? endDate);
}

public class DailyTimesheetGroup
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal TotalHours { get; set; }
}