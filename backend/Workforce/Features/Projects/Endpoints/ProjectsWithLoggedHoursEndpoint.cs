using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Workforce.Features.Projects.Services;

namespace Workforce.Features.Projects.Endpoints;

public static class ProjectsWithLoggedHoursEndpoint
{
    public static void MapProjectsWithLoggedHours(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/projects")
            .WithTags("Projects")
            .RequireAuthorization();

        group.MapGet("/with-logged-hours", async (
            IProjectService projectService,
            string? status,
            string? search) =>
        {
            var result = await projectService.GetProjectsWithLoggedHoursAsync(status, search);
            return Results.Ok(result);
        })
        .WithName("GetProjectsWithLoggedHours")
        .Produces<IEnumerable<object>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);
    }
}