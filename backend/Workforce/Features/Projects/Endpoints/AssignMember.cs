using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Services;

namespace Workforce.Features.Projects.Endpoints;

public static class AssignMemberEndpoint
{
    public static void MapAssignMember(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/projects").WithTags("Project Members").RequireAuthorization();   // ✅ protect all member endpoints;

        group.MapPost("/{projectId:guid}/members", async (Guid projectId, AssignMembersRequest request, IProjectService service) =>
        {
            try
            {
                var added = await service.AssignMembersToProjectAsync(projectId, request);
                return Results.Ok(new { Added = added, Message = added.Any() ? "Members assigned" : "All users already assigned" });
            }
            catch (KeyNotFoundException) { return Results.NotFound("Project not found"); }
        });

        group.MapDelete("/{projectId:guid}/members/{userId:guid}", async (Guid projectId, Guid userId, IProjectService service) =>
        {
            var removed = await service.RemoveMemberFromProjectAsync(projectId, userId);
            return removed ? Results.NoContent() : Results.NotFound();
        });

        group.MapGet("/{projectId:guid}/members", async (Guid projectId, IProjectService service) =>
            Results.Ok(await service.GetProjectMembersAsync(projectId)));
    }
}