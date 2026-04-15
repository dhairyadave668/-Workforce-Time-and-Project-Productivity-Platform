namespace Workforce.Features.Timesheets.DTOs;

public class CreateDailyTimesheetDto
{
    public string EntraId { get; set; } = string.Empty;

    // ADD THIS
    public string Status { get; set; } = "draft";

    public List<TimesheetEntryDto> Entries { get; set; } = new();
}

public class TimesheetEntryDto
{
    public Guid? ProjectId { get; set; }
    public Guid? TaskId { get; set; }

    public DateTime EntryDate { get; set; }

    public decimal Hours { get; set; }

    public string? Note { get; set; } 
}
