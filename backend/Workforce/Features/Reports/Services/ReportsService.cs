using Microsoft.EntityFrameworkCore;
using Workforce.Features.Identity.Infrastructure;
using Workforce.Features.Projects.Entities;
using Workforce.Infrastructure.Persistence;
using Workforce.Features.Timesheets.Infrastructure;
using Workforce.Features.Reports.DTOs;

namespace Workforce.Features.Reports.Services;

public class ReportsService : IReportsService
{
    private readonly AppDbContext _projectDb;
    private readonly AppDbContext _timesheetDb;
    private readonly AppDbContext _identityDb;

    public ReportsService(AppDbContext projectDb, AppDbContext timesheetDb, AppDbContext identityDb)
    {
        _projectDb = projectDb;
        _timesheetDb = timesheetDb;
        _identityDb = identityDb;
    }

    // ========== PROJECT SUMMARY ==========
    public async Task<List<ProjectReportDto>> GetProjectSummary(DateTime? startDate, DateTime? endDate)
    {
        var projects = await _projectDb.Projects
            .Where(p => !p.IsDeleted)
            .Select(p => new { p.Id, p.Name, p.PlannedHours })
            .ToListAsync();

        var projectIds = projects.Select(p => p.Id).ToList();

        var taskIds = await _projectDb.ProjectTasks
            .Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)
                        && !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();

        var query = _timesheetDb.TimesheetEntries
            .Where(e => e.ProjectId.HasValue && e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);

        var hoursByProject = await query
            .GroupBy(e => e.ProjectId!.Value)
            .Select(g => new { ProjectId = g.Key, TotalHours = g.Sum(e => e.Hours) })
            .ToDictionaryAsync(g => g.ProjectId, g => g.TotalHours);

        var headcountByProject = await _projectDb.ProjectAssignments
            .Where(a => projectIds.Contains(a.ProjectId) && !a.User.IsDeleted)
            .GroupBy(a => a.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ProjectId, g => g.Count);

        return projects.Select(p => new ProjectReportDto
        {
            ProjectId = p.Id.ToString(),
            ProjectName = p.Name,
            PlannedHours = p.PlannedHours,
            LoggedHours = hoursByProject.GetValueOrDefault(p.Id, 0),
            PercentComplete = p.PlannedHours > 0
                ? (double)(hoursByProject.GetValueOrDefault(p.Id, 0) / p.PlannedHours * 100)
                : 0,
            Headcount = headcountByProject.GetValueOrDefault(p.Id, 0)
        }).ToList();
    }

    // ========== USER SUMMARY ==========
    public async Task<List<UserReportDto>> GetUserSummary(string? userId, DateTime? startDate, DateTime? endDate)
    {
        var usersQuery = _identityDb.Users.Where(u => !u.IsDeleted);
        if (!string.IsNullOrEmpty(userId))
            usersQuery = usersQuery.Where(u => u.Id.ToString() == userId);
        var users = await usersQuery.Select(u => new { u.Id, u.Name }).ToListAsync();

        var taskIds = await _projectDb.ProjectTasks
            .Where(t => !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();

        var entriesQuery = _timesheetDb.TimesheetEntries
            .Where(e => e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            entriesQuery = entriesQuery.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            entriesQuery = entriesQuery.Where(e => e.EntryDate <= endDate.Value);
        if (!string.IsNullOrEmpty(userId))
            entriesQuery = entriesQuery.Where(e => e.UserId.ToString() == userId);

        var entries = await entriesQuery
            .Select(e => new { e.UserId, e.ProjectId, e.Hours })
            .ToListAsync();

        var validEntries = entries.Where(e => e.ProjectId.HasValue).ToList();

        var userProjectHours = validEntries
            .GroupBy(e => e.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Projects = g.GroupBy(e => e.ProjectId!.Value)
                    .Select(pg => new { ProjectId = pg.Key, Hours = pg.Sum(e => e.Hours) })
                    .ToList()
            }).ToList();

        var allProjectIds = userProjectHours.SelectMany(u => u.Projects).Select(p => p.ProjectId).Distinct().ToList();
        var projectDict = await _projectDb.Projects
            .Where(p => allProjectIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => new { p.Name, p.PlannedHours });

        var result = new List<UserReportDto>();
        foreach (var user in users)
        {
            var userData = userProjectHours.FirstOrDefault(u => u.UserId == user.Id);
            var projectsList = new List<ProjectReportDto>();
            if (userData != null)
            {
                foreach (var proj in userData.Projects)
                {
                    projectDict.TryGetValue(proj.ProjectId, out var projInfo);
                    var planned = projInfo?.PlannedHours ?? 0;
                    projectsList.Add(new ProjectReportDto
                    {
                        ProjectId = proj.ProjectId.ToString(),
                        ProjectName = projInfo?.Name ?? "Unknown",
                        PlannedHours = planned,
                        LoggedHours = proj.Hours,
                        PercentComplete = planned > 0 ? (double)(proj.Hours / planned * 100) : 0,
                        Headcount = 0
                    });
                }
            }
            result.Add(new UserReportDto
            {
                UserId = user.Id.ToString(),
                UserName = user.Name,
                Projects = projectsList
            });
        }
        return result;
    }

    // ========== USER-PROJECT MATRIX ==========
    public async Task<List<UserProjectRowDto>> GetUserProjectMatrix(string? userId, string? projectId, DateTime? startDate, DateTime? endDate)
    {
        var taskIds = await _projectDb.ProjectTasks
            .Where(t => !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();

        var query = _timesheetDb.TimesheetEntries
            .Where(e => e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);
        if (!string.IsNullOrEmpty(userId))
            query = query.Where(e => e.UserId.ToString() == userId);
        if (!string.IsNullOrEmpty(projectId))
            query = query.Where(e => e.ProjectId.ToString() == projectId);

        var entries = await query
            .Select(e => new { e.UserId, e.ProjectId, e.Hours })
            .ToListAsync();

        var validEntries = entries
            .Where(e => e.UserId.HasValue && e.ProjectId.HasValue)
            .ToList();

        var userIds = validEntries.Select(e => e.UserId!.Value).Distinct().ToList();
        var projectIdsList = validEntries.Select(e => e.ProjectId!.Value).Distinct().ToList();

        var userNames = await _identityDb.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name);

        var projectNames = await _projectDb.Projects
            .Where(p => projectIdsList.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name);

        var projectPlanned = await _projectDb.Projects
            .Where(p => projectIdsList.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.PlannedHours);

        var headcountByProject = await _projectDb.ProjectAssignments
            .Where(a => projectIdsList.Contains(a.ProjectId) && !a.User.IsDeleted)
            .GroupBy(a => a.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ProjectId, g => g.Count);

        var result = new List<UserProjectRowDto>();
        foreach (var e in validEntries)
        {
            var userIdGuid = e.UserId!.Value;
            var projectIdGuid = e.ProjectId!.Value;

            var userName = userNames.TryGetValue(userIdGuid, out var uname) ? uname : "Unknown";
            var projectName = projectNames.TryGetValue(projectIdGuid, out var pname) ? pname : "Unknown";
            var planned = projectPlanned.TryGetValue(projectIdGuid, out var pl) ? pl : 0;
            var percent = planned > 0 ? (double)(e.Hours / planned * 100) : 0;
            var headcount = headcountByProject.TryGetValue(projectIdGuid, out var hc) ? hc : 0;

            result.Add(new UserProjectRowDto
            {
                UserId = userIdGuid.ToString(),
                UserName = userName,
                ProjectId = projectIdGuid.ToString(),
                ProjectName = projectName,
                Hours = e.Hours,
                PlannedHours = planned,
                PercentComplete = percent,
                Headcount = headcount
            });
        }
        return result;
    }

    // ========== PROJECT BREAKDOWN ==========
    public async Task<List<ProjectBreakdownDto>> GetProjectBreakdown(string projectId, DateTime? startDate, DateTime? endDate)
    {
        if (!Guid.TryParse(projectId, out var projGuid))
            throw new ArgumentException("Invalid project ID");

        // Get project with its member allocations (including user details)
        var project = await _projectDb.Projects
            .Include(p => p.Assignments)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(p => p.Id == projGuid && !p.IsDeleted);
        if (project == null)
            throw new Exception("Project not found");

        var plannedHours = project.PlannedHours;

        // Get all allocated user IDs and names
        var allocatedUsers = project.Assignments
            .Where(a => a.User != null && !a.User.IsDeleted)
            .Select(a => new { a.UserId, UserName = a.User.Name })
            .ToList();

        if (!allocatedUsers.Any())
            return new List<ProjectBreakdownDto>(); // no members assigned

        // Get non-pending task IDs for this project
        var taskIds = await _projectDb.ProjectTasks
            .Where(t => t.ProjectId == projGuid && !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();

        // Query timesheet entries for the project, filtered by date and non-pending tasks
        var query = _timesheetDb.TimesheetEntries
            .Where(e => e.ProjectId == projGuid && e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value));

        if (startDate.HasValue)
            query = query.Where(e => e.EntryDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(e => e.EntryDate <= endDate.Value);

        // Group by user and sum logged hours
        var loggedHoursByUser = await query
            .Where(e => e.UserId.HasValue)
            .GroupBy(e => e.UserId!.Value)
            .Select(g => new { UserId = g.Key, TotalHours = g.Sum(e => e.Hours) })
            .ToDictionaryAsync(g => g.UserId, g => g.TotalHours);

        // Build result: include all allocated users, with logged hours (0 if not present)
        var result = allocatedUsers.Select(alloc => new ProjectBreakdownDto
        {
            UserId = alloc.UserId.ToString(),
            UserName = alloc.UserName,
            LoggedHours = loggedHoursByUser.GetValueOrDefault(alloc.UserId, 0),
            PlannedHours = plannedHours,
            PercentComplete = plannedHours > 0
                ? (double)(loggedHoursByUser.GetValueOrDefault(alloc.UserId, 0) / plannedHours * 100)
                : 0
        }).ToList();

        // Sort by logged hours descending (zeros at the bottom)
        return result.OrderByDescending(r => r.LoggedHours).ToList();
    }
}