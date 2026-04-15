using Workforce.Features.Approvals.DTOs;
using Workforce.Features.Timesheets.DTOs;
using Workforce.Features.Timesheets.Repository;
using Workforce.Features.Timesheets.Services;

namespace Workforce.Features.Timesheets.Services;

public class ApprovalService : IApprovalService
{
    private readonly ITimesheetRepository _repository;

    public ApprovalService(ITimesheetRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<ApprovalEntryDto>> GetEntries()
    {
        var entries = await _repository.GetApprovalEntriesAsync();

        return entries.Select(x => new ApprovalEntryDto
        {
            Id = x.Id,
            EntryDate = x.EntryDate,
            Hours = x.Hours,
            Note = x.Note,
            ProjectName = x.Project != null ? x.Project.Name : null,
            TaskName = x.Task != null ? x.Task.Name : null,
            UserName = x.User != null ? x.User.Name : null,
            TimesheetId = x.DailyTimesheetId,
            AdminRemarks = x.DailyTimesheet != null ? x.DailyTimesheet.AdminRemarks : null
        }).ToList();
    }

    public async Task<(DateTime entryDate, string userName)> UpdateRemark(UpdateRemarkDto dto)
    {
        var timesheets = await _repository.GetDailyTimesheetsByIdAndDateAsync(dto.TimesheetId, dto.EntryDate);

        if (!timesheets.Any())
            throw new Exception("No timesheets found");

        foreach (var ts in timesheets)
        {
            ts.AdminRemarks = dto.AdminRemarks;
            ts.ApprovedAt = DateTime.UtcNow;
        }

        await _repository.SaveChangesAsync();

        var first = timesheets.First();
        return (first.EntryDate, first.User?.Name ?? "Unknown");
    }

    public async Task<int> GetTotalRemarks()
    {
        return await _repository.GetTotalRemarksCountAsync();
    }
}