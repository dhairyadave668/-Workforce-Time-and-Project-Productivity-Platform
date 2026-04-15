using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Workforce.Features.Reports.Services;

namespace Workforce.Features.Reports.Endpoints;

public static class ReportsEndpoints
{
    public static void MapReportsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports")
            .WithTags("Reports");

        group.MapGet("/project-summary", async (DateTime? start, DateTime? end, IReportsService service) =>
        {
            var data = await service.GetProjectSummary(start, end);
            return Results.Ok(data);
        });

        group.MapGet("/user-summary", async (string? userId, DateTime? start, DateTime? end, IReportsService service) =>
        {
            var data = await service.GetUserSummary(userId, start, end);
            return Results.Ok(data);
        });

        group.MapGet("/user-project-matrix", async (string? userId, string? projectId, DateTime? start, DateTime? end, IReportsService service) =>
        {
            var data = await service.GetUserProjectMatrix(userId, projectId, start, end);
            return Results.Ok(data);
        });
        group.MapGet("/project-breakdown", async (string projectId, DateTime? start, DateTime? end, IReportsService service) =>
        {
            var data = await service.GetProjectBreakdown(projectId, start, end);
            return Results.Ok(data);
        });
    }
}