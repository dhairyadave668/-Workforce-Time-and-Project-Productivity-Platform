namespace Workforce.Features.Reports.DTOs;

public class ProjectBreakdownDto
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public decimal LoggedHours { get; set; }
    public decimal PlannedHours { get; set; }
    public double PercentComplete { get; set; }
}