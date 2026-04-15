namespace Workforce.Features.Reports.DTOs;

public class ProjectReportDto
{
    public string? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public decimal PlannedHours { get; set; }
    public decimal LoggedHours { get; set; }
    public double PercentComplete { get; set; }
    public int Headcount { get; set; }
}