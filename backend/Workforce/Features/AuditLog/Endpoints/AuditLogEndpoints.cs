using Microsoft.AspNetCore.Mvc;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.Identity.Services;

namespace Workforce.Features.AuditLog.Endpoints;

public static class AuditLogEndpoints
{
    public static void MapAuditLogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit-logs")
                       .WithTags("Audit Logs");

        // GET LOGS (Admin only)
        group.MapGet("/", async (
            HttpContext http,
            [FromServices] IAuditLogService service,
            [FromServices] IUserService userService   // ← Use interface
        ) =>
        {
            try
            {
                var entraId = http.Request.Headers["entraId"].FirstOrDefault();
                if (string.IsNullOrEmpty(entraId))
                    return Results.Unauthorized();

                var role = await userService.GetUserRoleByEntraId(entraId);
                if (role != "Admin")
                    return Results.Forbid();

                var data = await service.GetLogsAsync();
                return Results.Ok(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return Results.Problem(ex.Message);
            }
        });

        // CREATE LOG (Admin only)
        group.MapPost("/", async (
            HttpContext http,
            CreateAuditLogDto dto,
            [FromServices] IAuditLogService service,
            [FromServices] IUserService userService   // ← Use interface
        ) =>
        {
            try
            {
                var entraId = http.Request.Headers["entraId"].FirstOrDefault();
                if (string.IsNullOrEmpty(entraId))
                    return Results.Unauthorized();

                var role = await userService.GetUserRoleByEntraId(entraId);
                if (role != "Admin")
                    return Results.Forbid();

                await service.CreateLog(entraId, dto);
                return Results.Ok(new { message = "Log created" });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}