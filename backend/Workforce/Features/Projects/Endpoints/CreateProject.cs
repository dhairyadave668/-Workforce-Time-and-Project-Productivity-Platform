using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using Workforce.Features.Identity.Repository;
using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Services;

namespace Workforce.Features.Projects.Endpoints;

public static class CreateProjectEndpoint
{
    public static void MapCreateProject(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/projects").RequireAuthorization();

        // ================= COMMON USER FUNCTION =================
        static (string Name, string Email) GetUser(HttpContext context)
        {
          
            var email =
                context.User.FindFirst(ClaimTypes.Email)?.Value ??
                context.User.FindFirst("preferred_username")?.Value ??
                context.User.FindFirst("upn")?.Value ??
                "Unknown";

          
            var name =
                context.User.FindFirst("name")?.Value ??
                context.User.FindFirst(ClaimTypes.Name)?.Value ??
                email;

            return (name, email);
        }

        // ================= CREATE =================
        group.MapPost("/", async (
            HttpContext httpContext,
            CreateProjectRequest request,
            IProjectService service
        ) =>
        {
            try
            {
                var (name, email) = GetUser(httpContext);

                // ✅ AUDIT
                httpContext.Items["AuditModule"] = "Project";
                httpContext.Items["AuditStatus"] = "Created";
                httpContext.Items["AuditMetadata"] = new
                {
                    Action = "Project Created",
                    CreatedBy = new
                    {
                        Name = name

                    }
                };

                var result = await service.CreateProjectAsync(request);

                return Results.Created($"/projects/{((dynamic)result).Id}", result);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(ex.Message);
            }
        });

        // ================= UPDATE =================
        group.MapPut("/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            UpdateProjectRequest request,
            IProjectService service
        ) =>
        {
            var (name, email) = GetUser(httpContext);

         
            httpContext.Items["AuditModule"] = "Project";
            httpContext.Items["AuditStatus"] = "Updated";
            httpContext.Items["AuditMetadata"] = new
            {
                Action = "Project Updated",
                UpdatedBy = new
                {
                    Name = name
                }
            };

            var result = await service.UpdateProjectAsync(id, request);

            return result is not null ? Results.Ok(result) : Results.NotFound();
        });

        // ================= DELETE =================
        group.MapDelete("/{id:guid}", async (
            Guid id,
            HttpContext httpContext,
            IProjectService service
        ) =>
        {
            var (name, email) = GetUser(httpContext);

            // ✅ AUDIT
            httpContext.Items["AuditModule"] = "Project";
            httpContext.Items["AuditStatus"] = "Deleted";
            httpContext.Items["AuditMetadata"] = new
            {
                Action = "Project Deleted",
                DeletedBy = new
                {
                    Name = name
                }
            };

            var deleted = await service.DeleteProjectAsync(id);

            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapGet("/count", async (IProjectService service, string? entraId) =>
        {
            if (!string.IsNullOrEmpty(entraId))
            {
                try
                {
                    var count = await service.GetUserProjectCountAsync(entraId);
                    return Results.Ok(new { count });
                }
                catch (KeyNotFoundException)
                {
                    return Results.NotFound("User not found");
                }
            }
            else
            {
                return Results.Ok(new { count = await service.GetTotalProjectCountAsync() });
            }
        });
        // ================= GET ALL =================
        group.MapGet("/", async (
            HttpContext http,
            IProjectService service,
            IUserRepository userRepo,
            string? status,
            string? search,
            string? userId   // ✅ NEW: optional query parameter
        ) =>
        {
            // Get current user's EntraId from claims
            var entraId = http.User.FindFirst("oid")?.Value ??
                          http.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(entraId))
                return Results.Unauthorized();

            var currentUser = await userRepo.GetUserByEntraIdAsync(entraId);
            if (currentUser == null)
                return Results.Unauthorized();

            var isAdmin = currentUser.Role?.RoleName == "Admin";
            Guid? filterUserId = null;

            // If a userId is provided in the query string
            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var parsedUserId))
            {
                // Only admins can filter by another user's ID
                if (isAdmin)
                    filterUserId = parsedUserId;
                else
                    return Results.Forbid();  // Non-admin cannot request another user's projects
            }
            else if (!isAdmin)
            {
                // Employee without userId parameter: only their own projects
                filterUserId = currentUser.Id;
            }
            // For admin with no userId: filterUserId stays null → all projects

            var result = await service.GetAllProjectsAsync(status, search, filterUserId);
            return Results.Ok(result);
        });
        // ================= GET BY ID =================
        group.MapGet("/{id:guid}", async (
            Guid id,
            IProjectService service
        ) =>
        {
            var project = await service.GetProjectByIdAsync(id);
            return project is not null ? Results.Ok(project) : Results.NotFound();
        });
        group.MapGet("/count/user", async (
      HttpContext httpContext,
      IProjectService service
  ) =>
        {
            var entraId =
                httpContext.User.FindFirst("oid")?.Value ??
                httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(entraId))
                return Results.Unauthorized();

            var count = await service.GetUserProjectCountAsync(entraId);

            return Results.Ok(new { count });
        });
    }
    }