namespace Workforce.Features.Reports.DTOs;
using Workforce.Features.Identity.Entities;
public class UserReportDto
{
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public List<ProjectReportDto> Projects { get; set; } = new();
}