namespace Workforce.Features.Timesheets.DTOs;

public class TimesheetEntryResponseDto
{
    public Guid UserId { get; set; }
    public string? UserName { get; set; }

    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string? ProjectName { get; set; }

    public Guid TaskId { get; set; }
    public string? TaskName { get; set; }

    public DateTime EntryDate { get; set; }
    public int Hours { get; set; }
    public string? Note { get; set; }
}