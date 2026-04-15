namespace Workforce.Features.Reports.DTOs;

public class UserProjectRowDto
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public decimal Hours { get; set; }
    public decimal PlannedHours { get; set; }
    public double PercentComplete { get; set; }
    public int Headcount { get; set; }
}