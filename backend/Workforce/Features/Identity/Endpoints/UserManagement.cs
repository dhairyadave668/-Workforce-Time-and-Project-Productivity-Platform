using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Workforce.Features.Identity.DTOs;
using Workforce.Features.Identity.Services;
using Workforce.Features.Projects.Services;

namespace Workforce.Features.Identity.Endpoints;

public static class UserManagement
{
    public static IEndpointRouteBuilder MapUserManagement(this IEndpointRouteBuilder app)
    {
        // GET USERS (Admin only)
        app.MapGet("/users", async (IUserService service) =>
        {
            var users = await service.GetUsers();
            return Results.Ok(users);
        })
        .RequireAuthorization(policy => policy.RequireRole("Admin"))
        .WithTags("User Management");

        // ADD USER (Admin only)
        app.MapPost("/users", async (
            HttpContext context,
            CreateUserRequest request,
            IUserService service) =>
        {
            context.Items["AuditModule"] = "User";
            context.Items["AuditStatus"] = "Created";

            var result = await service.AddUser(
                request.EmployeeId,
                request.Name,
                request.Email,
                request.Role
            );

            if (!result)
                return Results.BadRequest(new { message = "User already exists or role invalid" });

            context.Items["AuditTargetName"] = request.Name;
            context.Items["AuditTargetEmail"] = request.Email;

            return Results.Ok(new { message = "User added successfully" });
        })
        .RequireAuthorization(policy => policy.RequireRole("Admin"))
        .WithTags("User Management");

        // CHANGE ROLE (Admin only)
        app.MapPut("/users/{id:guid}/role", async (
            HttpContext context,
            Guid id,
            ChangeUserRoleRequest request,
            IUserService userService) =>
        {
            context.Items["AuditModule"] = "User";
            context.Items["AuditStatus"] = "Updated";

            // Fetch user details for audit log using service
            var user = (await userService.GetUsers()).FirstOrDefault(u => u.Id == id);
            var result = await userService.ChangeUserRole(id, request.RoleName);

            if (!result)
                return Results.BadRequest(new { message = "Role update failed" });

            if (user != null)
            {
                context.Items["AuditTargetName"] = user.Name;
                context.Items["AuditTargetEmail"] = user.Email;
            }

            return Results.Ok(new { message = "User role updated successfully" });
        })
        .RequireAuthorization(policy => policy.RequireRole("Admin"))
        .WithTags("User Management");

        // DELETE USER (Admin only)
        app.MapDelete("/users/{id:guid}", async (
            HttpContext context,
            Guid id,
            IUserService userService) =>
        {
            context.Items["AuditModule"] = "User";
            context.Items["AuditStatus"] = "Deleted";

            // Fetch user details for audit log using service
            var user = (await userService.GetUsers()).FirstOrDefault(u => u.Id == id);
            var result = await userService.DeleteUser(id);

            if (!result)
                return Results.NotFound(new { message = "User not found" });

            if (user != null)
            {
                context.Items["AuditTargetName"] = user.Name;
                context.Items["AuditTargetEmail"] = user.Email;
            }

            return Results.Ok(new { message = "User deleted successfully" });
        })
        .RequireAuthorization(policy => policy.RequireRole("Admin"))
        .WithTags("User Management");

        // GET USER BY ENTRA ID (Public – no authentication, original behavior)
        app.MapGet("/users/by-entraid/{entraId}", async (
            string entraId,
            IUserService userService) =>
        {
            var user = await userService.GetUserByEntraIdAsync(entraId);
            if (user == null) return Results.NotFound();
            return Results.Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                role = user.Role
            });
        })
        .WithTags("User Management");   // No RequireAuthorization – public

        // GET CURRENT USER (Authenticated)
        app.MapGet("/me", async (
            HttpContext http,
            IUserService userService) =>
        {
            var entraId = http.User.FindFirst("oid")?.Value;
            if (string.IsNullOrEmpty(entraId))
                return Results.Unauthorized();

            var user = await userService.GetUserByEntraIdAsync(entraId);
            if (user == null) return Results.NotFound();

            return Results.Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                role = user.Role
            });
        })
        .RequireAuthorization()
        .WithTags("User Management");

        // GET USER BY ID (with project sharing check)
        app.MapGet("/users/{id:guid}", async (
            Guid id,
            HttpContext http,
            IUserService userService,
            IProjectService projectService) =>
        {
            var currentEntraId = http.User.FindFirst("oid")?.Value;
            if (string.IsNullOrEmpty(currentEntraId))
                return Results.Unauthorized();

            var currentUser = await userService.GetUserByEntraIdAsync(currentEntraId);
            if (currentUser == null)
                return Results.NotFound("Current user not found");

            var isAdmin = currentUser.Role == "Admin";
            var targetUser = (await userService.GetUsers()).FirstOrDefault(u => u.Id == id);
            if (targetUser == null)
                return Results.NotFound("User not found");

            if (!isAdmin)
            {
                var shareProject = await projectService.DoUsersShareProjectAsync(currentUser.Id, id);
                if (!shareProject)
                    return Results.Forbid();
            }

            return Results.Ok(new
            {
                targetUser.Id,
                targetUser.Name,
                targetUser.Email,
                role = targetUser.Role
            });
        })
        .RequireAuthorization()
        .WithTags("User Management");

        return app;
    }
}