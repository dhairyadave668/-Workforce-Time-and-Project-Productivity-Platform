namespace Workforce.Features.Approvals.DTOs;

public class ApprovalEntryDto
{
    public Guid Id { get; set; }

    public DateTime EntryDate { get; set; }

    public decimal Hours { get; set; }

    public string? Note { get; set; }

    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }

    public Guid? TaskId { get; set; }
    public string? TaskName { get; set; }

    public string? UserName { get; set; }

    public Guid TimesheetId { get; set; }

    public string? AdminRemarks { get; set; }

}