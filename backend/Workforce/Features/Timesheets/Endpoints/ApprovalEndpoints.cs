using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;          // ✅ Required for [FromServices]
using System.Security.Claims;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.Identity.Services;
using Workforce.Features.Timesheets.DTOs;
using Workforce.Features.Timesheets.Services;

namespace Workforce.Features.Timesheets.Endpoints;

public static class ApprovalEndpoints
{
    public static void MapApprovalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/approvals")
                        .WithTags("Approvals");

        // ✅ [FromServices] on all service parameters
        group.MapGet("/entries", async (
            HttpContext http,
            [FromServices] IApprovalService service,
            [FromServices] IUserService userService
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

                var data = await service.GetEntries();
                return Results.Ok(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return Results.Problem(ex.Message);
            }
        });

        group.MapGet("/remarks/count", async (
            [FromServices] IApprovalService service) =>
        {
            var count = await service.GetTotalRemarks();
            return Results.Ok(count);
        });

        group.MapPut("/remark", async (
            HttpContext http,
            UpdateRemarkDto dto,
            [FromServices] IApprovalService service,
            [FromServices] AuditLogService auditLogService,
            [FromServices] IUserService userService
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

                if (dto.TimesheetId == Guid.Empty)
                    return Results.BadRequest("TimesheetId is required");

                var result = await service.UpdateRemark(dto);

                http.Items["SkipAudit"] = true;

                await auditLogService.CreateLog(entraId, new CreateAuditLogDto
                {
                    Action = "Approval Remark",
                    Target = "/api/approvals/remark",
                    Metadata = $"User:{result.userName};Date:{result.entryDate:yyyy-MM-dd}"
                });

                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }
}