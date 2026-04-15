using Workforce.Features.Reports.DTOs;

namespace Workforce.Features.Reports.Services;

public interface IReportsService
{
    Task<List<ProjectReportDto>> GetProjectSummary(DateTime? startDate, DateTime? endDate);
    Task<List<UserReportDto>> GetUserSummary(string? userId, DateTime? startDate, DateTime? endDate);
    Task<List<ProjectBreakdownDto>> GetProjectBreakdown(string projectId, DateTime? startDate, DateTime? endDate);
    Task<List<UserProjectRowDto>> GetUserProjectMatrix(string? userId, string? projectId, DateTime? startDate, DateTime? endDate);
}