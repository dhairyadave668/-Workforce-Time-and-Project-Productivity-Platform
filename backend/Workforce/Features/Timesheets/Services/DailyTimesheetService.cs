using Microsoft.EntityFrameworkCore;
using Workforce.Features.Identity.Repository;
using Workforce.Features.Projects.Services;
using Workforce.Features.Timesheets.DTOs;
using Workforce.Features.Timesheets.Entities;
using Workforce.Features.Timesheets.Repository;

namespace Workforce.Features.Timesheets.Services;

public class DailyTimesheetService : IDailyTimesheetService
{
    private readonly ITimesheetRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly IProjectService _projectService;

    public DailyTimesheetService(
        ITimesheetRepository repository,
        IUserRepository userRepository,
        IProjectService projectService)
    {
        _repository = repository;
        _userRepository = userRepository;
        _projectService = projectService;
    }

    public async Task<List<TimesheetEntryResponseDto>> GetAll(bool excludePending = false)
    {
        var entries = await _repository.GetTimesheetEntriesAsync(excludePending);

        return entries.Select(e => new TimesheetEntryResponseDto
        {
            Id = e.Id,
            UserId = e.UserId ?? Guid.Empty,
            UserName = e.User?.Name,
            ProjectId = e.ProjectId ?? Guid.Empty,
            ProjectName = e.Project?.Name,
            TaskId = e.TaskId ?? Guid.Empty,
            TaskName = e.Task?.Name,
            EntryDate = e.EntryDate,
            Hours = (int)e.Hours,
            Note = e.Note
        }).ToList();
    }

    public async Task<List<TimesheetEntry>> GetAll()
    {
        return await _repository.GetAllTimesheetEntriesAsync();
    }

    public async Task CreateDailyTimesheet(CreateDailyTimesheetDto dto)
    {
        if (!dto.Entries.Any())
            return;

        // ✅ Use repository instead of direct DbContext
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(dto.EntraId);
        if (user == null)
            throw new Exception($"User with EntraId '{dto.EntraId}' not found.");

        var userId = user.Id;
        var dailyGroups = dto.Entries.GroupBy(x => x.EntryDate.Date);

        foreach (var dayGroup in dailyGroups)
        {
            var entryDate = dayGroup.Key;
            var daily = await _repository.GetDailyTimesheetByUserAndDateAsync(userId, entryDate);

            if (daily == null)
            {
                daily = new DailyTimesheet
                {
                    Id = Guid.NewGuid(),
                    TimesheetId = Guid.NewGuid(),
                    EntryDate = entryDate,
                    UserId = userId,
                    DailyHours = dayGroup.Sum(x => x.Hours),
                    Status = dto.Status,
                    SubmittedAt = dto.Status == "submitted" ? DateTime.UtcNow : null
                };

                await _repository.AddDailyTimesheetAsync(daily);
                await _repository.SaveChangesAsync();
            }
            else
            {
                if (daily.Status == "submitted")
                    continue;

                daily.DailyHours = dayGroup.Sum(x => x.Hours);
                daily.Status = dto.Status;

                if (dto.Status == "submitted")
                    daily.SubmittedAt = DateTime.UtcNow;

                _repository.UpdateDailyTimesheet(daily);
            }

            var oldEntries = await _repository.GetTimesheetEntriesByUserAndDateAsync(userId, entryDate);
            _repository.RemoveTimesheetEntriesRange(oldEntries);

            foreach (var entry in dayGroup)
            {
                var newEntry = new TimesheetEntry
                {
                    Id = Guid.NewGuid(),
                    DailyTimesheetId = daily.Id,
                    UserId = userId,
                    ProjectId = entry.ProjectId,
                    TaskId = entry.TaskId,
                    EntryDate = entry.EntryDate.Date,
                    Hours = entry.Hours,
                    Note = entry.Note,
                    Created_On = DateTime.UtcNow,
                    Updated_On = DateTime.UtcNow
                };

                await _repository.AddTimesheetEntryAsync(newEntry);
            }
        }

        await _repository.SaveChangesAsync();

        var affectedProjectIds = dto.Entries
            .Where(e => e.ProjectId.HasValue)
            .Select(e => e.ProjectId!.Value)
            .Distinct()
            .ToList();

        foreach (var projectId in affectedProjectIds)
        {
            await _projectService.UpdateProjectLoggedHoursAsync(projectId);
        }
    }

    public async Task<List<TimesheetHistoryDto>> GetHistory()
    {
        var history = await _repository.GetAllDailyTimesheetsAsync();
        return history.Select(x => new TimesheetHistoryDto
        {
            Id = x.Id,
            TimesheetId = x.TimesheetId,
            EntryDate = x.EntryDate,
            Status = x.Status,
            SubmittedAt = x.SubmittedAt,
            ApprovedAt = x.ApprovedAt,
            AdminRemarks = x.AdminRemarks
        }).ToList();
    }

    public async Task<List<TimesheetHistoryDto>> GetHistoryByEntraId(string entraId)
    {
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            throw new Exception($"User with EntraId '{entraId}' not found.");

        var history = await _repository.GetDailyTimesheetsByUserIdAsync(user.Id);
        return history.Select(x => new TimesheetHistoryDto
        {
            Id = x.Id,
            TimesheetId = x.TimesheetId,
            EntryDate = x.EntryDate,
            Status = x.Status,
            SubmittedAt = x.SubmittedAt,
            ApprovedAt = x.ApprovedAt,
            AdminRemarks = x.AdminRemarks
        }).ToList();
    }

    public async Task<List<TimesheetEntry>> GetAllByEntraId(string entraId)
    {
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            throw new Exception($"User with EntraId '{entraId}' not found.");

        return await _repository.GetTimesheetEntriesByUserIdAsync(user.Id);
    }

    public async Task<double> GetCurrentWeekHours(string entraId)
    {
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            throw new Exception($"User with EntraId '{entraId}' not found.");

        var today = DateTime.UtcNow.Date;
        var diff = (int)today.DayOfWeek - (int)DayOfWeek.Monday;
        if (diff < 0) diff += 7;

        var startOfWeek = today.AddDays(-diff);
        var endOfWeek = startOfWeek.AddDays(6);

        var totalHours = await _repository.GetCurrentWeekHoursAsync(user.Id, startOfWeek, endOfWeek);
        return (double)totalHours;
    }

    public async Task<int> GetAdminRemarksCount(string entraId)
    {
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            throw new Exception($"User with EntraId '{entraId}' not found.");

        var today = DateTime.UtcNow.Date;
        int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
        var startOfWeek = today.AddDays(-diff);
        var endOfWeek = startOfWeek.AddDays(7);

        return await _repository.GetAdminRemarksCountForWeekAsync(user.Id, startOfWeek, endOfWeek);
    }

    public async Task<List<object>> GetMonthlyHours(string entraId)
    {
        var user = await _userRepository.GetUserByEntraIdIncludingDeletedAsync(entraId);
        if (user == null)
            throw new Exception($"User with EntraId '{entraId}' not found.");

        var grouped = await _repository.GetMonthlyHoursGroupedAsync(user.Id);
        var formatted = grouped.Select(x => new
        {
            month = System.Globalization.CultureInfo.CurrentCulture
                .DateTimeFormat.GetAbbreviatedMonthName(x.Month),
            hours = x.TotalHours
        }).ToList();

        return formatted.Cast<object>().ToList();
    }
}