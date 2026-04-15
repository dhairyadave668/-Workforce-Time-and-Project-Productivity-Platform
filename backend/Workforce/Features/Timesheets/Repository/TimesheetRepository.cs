using Microsoft.EntityFrameworkCore;
using Workforce.Features.Projects.Entities;
using Workforce.Features.Timesheets.Entities;
using Workforce.Features.Timesheets.Infrastructure;
using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.Timesheets.Repository;

public class TimesheetRepository : ITimesheetRepository
{
    private readonly AppDbContext _context;

    public TimesheetRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TimesheetEntry>> GetApprovalEntriesAsync()
    {
        return await _context.TimesheetEntries
            .Include(x => x.DailyTimesheet)
            .Include(x => x.User)
            .Include(x => x.Project)
            .Include(x => x.Task)
            .OrderByDescending(x => x.EntryDate)
            .ToListAsync();
    }

    public async Task<List<DailyTimesheet>> GetDailyTimesheetsByIdAndDateAsync(Guid timesheetId, DateTime? entryDate)
    {
        var query = _context.DailyTimesheets
            .Include(x => x.User)
            .Where(x => x.Id == timesheetId);

        if (entryDate.HasValue)
        {
            query = query.Where(x => x.EntryDate.Date == entryDate.Value.Date);
        }

        return await query.ToListAsync();
    }

    public async Task<int> GetTotalRemarksCountAsync()
    {
        return await _context.DailyTimesheets
            .CountAsync(x => !string.IsNullOrEmpty(x.AdminRemarks));
    }

    public async Task<List<TimesheetEntry>> GetTimesheetEntriesAsync(bool excludePending)
    {
        var query = _context.TimesheetEntries
            .Include(e => e.Project)
            .Include(e => e.Task)
            .Include(e => e.User)
            .AsQueryable();

        if (excludePending)
        {
            query = query.Where(e => e.Task == null || e.Task.Status != "Pending");
        }

        return await query
            .OrderByDescending(e => e.EntryDate)
            .ToListAsync();
    }

    public async Task<DailyTimesheet?> GetDailyTimesheetByUserAndDateAsync(Guid userId, DateTime date)
    {
        return await _context.DailyTimesheets
            .FirstOrDefaultAsync(x => x.UserId == userId && x.EntryDate == date);
    }

    public async Task<List<TimesheetEntry>> GetTimesheetEntriesByUserAndDateAsync(Guid userId, DateTime date)
    {
        return await _context.TimesheetEntries
            .Where(x => x.UserId == userId && x.EntryDate.Date == date.Date)
            .ToListAsync();
    }

    public async Task AddDailyTimesheetAsync(DailyTimesheet daily)
    {
        await _context.DailyTimesheets.AddAsync(daily);
    }

    public async Task AddTimesheetEntryAsync(TimesheetEntry entry)
    {
        await _context.TimesheetEntries.AddAsync(entry);
    }

    public void UpdateDailyTimesheet(DailyTimesheet daily)
    {
        _context.DailyTimesheets.Update(daily);
    }

    public void RemoveTimesheetEntriesRange(IEnumerable<TimesheetEntry> entries)
    {
        _context.TimesheetEntries.RemoveRange(entries);
    }

    public async Task<List<DailyTimesheet>> GetAllDailyTimesheetsAsync()
    {
        return await _context.DailyTimesheets
            .OrderByDescending(x => x.EntryDate)
            .ToListAsync();
    }

    public async Task<List<DailyTimesheet>> GetDailyTimesheetsByUserIdAsync(Guid userId)
    {
        return await _context.DailyTimesheets
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.EntryDate)
            .ToListAsync();
    }

    public async Task<List<TimesheetEntry>> GetTimesheetEntriesByUserIdAsync(Guid userId)
    {
        return await _context.TimesheetEntries
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.EntryDate)
            .ToListAsync();
    }

    public async Task<decimal> GetCurrentWeekHoursAsync(Guid userId, DateTime startOfWeek, DateTime endOfWeek)
    {
        return await _context.DailyTimesheets
            .Where(x => x.UserId == userId && x.EntryDate >= startOfWeek && x.EntryDate <= endOfWeek)
            .SumAsync(x => (decimal?)x.DailyHours) ?? 0;
    }

    public async Task<int> GetAdminRemarksCountForWeekAsync(Guid userId, DateTime startOfWeek, DateTime endOfWeek)
    {
        return await _context.DailyTimesheets
            .Where(x => x.UserId == userId &&
                        !string.IsNullOrEmpty(x.AdminRemarks) &&
                        x.EntryDate >= startOfWeek &&
                        x.EntryDate < endOfWeek)
            .CountAsync();
    }

    public async Task<List<DailyTimesheetGroup>> GetMonthlyHoursGroupedAsync(Guid userId)
    {
        var result = await _context.DailyTimesheets
            .Where(x => x.UserId == userId)
            .GroupBy(x => new { x.EntryDate.Year, x.EntryDate.Month })
            .Select(g => new DailyTimesheetGroup
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                TotalHours = g.Sum(x => x.DailyHours)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync();

        return result;
    }

    // ✅ ADDED: raw entity version (no includes, no filter)
    public async Task<List<TimesheetEntry>> GetAllTimesheetEntriesAsync()
    {
        return await _context.TimesheetEntries
            .OrderByDescending(x => x.EntryDate)
            .ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
    // ✅ NEW: Get timesheet entries for a list of project IDs
    public async Task<List<TimesheetEntry>> GetTimesheetEntriesByProjectIdsAsync(List<Guid> projectIds)
    {
        return await _context.TimesheetEntries
            .Where(e => e.ProjectId.HasValue && projectIds.Contains(e.ProjectId.Value))
            .ToListAsync();
    }
    // ✅ NEW implementations
    public async Task<Dictionary<Guid, decimal>> GetLoggedHoursGroupedByProjectAsync(
        List<Guid> projectIds,
        DateTime? startDate,
        DateTime? endDate,
        bool onlyNonPendingTasks = true)
    {
        if (!projectIds.Any())
            return new Dictionary<Guid, decimal>();

        HashSet<Guid>? allowedTaskIds = null;
        if (onlyNonPendingTasks)
        {
            var taskIds = await _context.ProjectTasks
                .Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)
                            && !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
                .Select(t => t.Id)
                .ToListAsync();
            allowedTaskIds = taskIds.ToHashSet();
        }

        var query = _context.TimesheetEntries
            .Where(e => e.ProjectId.HasValue && projectIds.Contains(e.ProjectId.Value));

        if (onlyNonPendingTasks && allowedTaskIds != null && allowedTaskIds.Any())
            query = query.Where(e => e.TaskId.HasValue && allowedTaskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);

        return await query
            .GroupBy(e => e.ProjectId!.Value)
            .Select(g => new { ProjectId = g.Key, TotalHours = g.Sum(e => e.Hours) })
            .ToDictionaryAsync(g => g.ProjectId, g => g.TotalHours);
    }

    public async Task<Dictionary<Guid, Dictionary<Guid, decimal>>> GetUserProjectHoursGroupedAsync(
     DateTime? startDate,
     DateTime? endDate,
     List<Guid>? userIds = null,
     List<Guid>? projectIds = null)
    {
        var query = _context.TimesheetEntries.AsQueryable();

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);
        if (userIds != null && userIds.Any())
            query = query.Where(e => e.UserId.HasValue && userIds.Contains(e.UserId.Value));
        if (projectIds != null && projectIds.Any())
            query = query.Where(e => e.ProjectId.HasValue && projectIds.Contains(e.ProjectId.Value));

        var entries = await query
            .Where(e => e.UserId.HasValue && e.ProjectId.HasValue)
            .Select(e => new { UserId = e.UserId!.Value, ProjectId = e.ProjectId!.Value, e.Hours })
            .ToListAsync();

        var result = new Dictionary<Guid, Dictionary<Guid, decimal>>();
        foreach (var entry in entries)
        {
            if (!result.ContainsKey(entry.UserId))
                result[entry.UserId] = new Dictionary<Guid, decimal>();
            var userDict = result[entry.UserId];
            if (!userDict.ContainsKey(entry.ProjectId))
                userDict[entry.ProjectId] = 0;
            userDict[entry.ProjectId] += entry.Hours;
        }
        return result;
    }
    public async Task<Dictionary<Guid, decimal>> GetLoggedHoursByUserForProjectAsync(
        Guid projectId,
        DateTime? startDate,
        DateTime? endDate)
    {
        var taskIds = await _context.ProjectTasks
            .Where(t => t.ProjectId == projectId && !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();

        if (!taskIds.Any())
            return new Dictionary<Guid, decimal>();

        var query = _context.TimesheetEntries
            .Where(e => e.ProjectId == projectId && e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);

        return await query
            .Where(e => e.UserId.HasValue)
            .GroupBy(e => e.UserId!.Value)
            .Select(g => new { UserId = g.Key, TotalHours = g.Sum(e => e.Hours) })
            .ToDictionaryAsync(g => g.UserId, g => g.TotalHours);
    }
}



