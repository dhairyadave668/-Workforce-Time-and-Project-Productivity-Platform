using Workforce.Features.Timesheets.DTOs;
using Workforce.Features.Timesheets.Services;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Features.Identity.Services;

namespace Workforce.Features.Timesheets.Endpoints
{
    public static class DailyTimesheetEndpoints
    {
        public static void MapDailyTimesheetEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/timesheets")
                           .WithTags("Timesheet and DailyTimesheet");

            group.MapPost("/", async (
                CreateDailyTimesheetDto dto,
                IDailyTimesheetService service,
                IUserService userService,
                AuditLogService auditLogService
            ) =>
            {
                await service.CreateDailyTimesheet(dto);

                var status = dto.Status?.ToLower();

                if (status == "draft" || status == "submitted")
                {
                    var user = await userService.GetUserByEntraIdAsync(dto.EntraId);
                    if (user != null)
                    {
                        await auditLogService.CreateLog(dto.EntraId, new CreateAuditLogDto
                        {
                            Action = $"Timesheet {status}",
                            Target = "/api/timesheets",
                            Metadata = $"User: {user.Email}, Hours submitted",
                            RoleId = user.RoleId
                        });
                    }
                }

                return Results.Ok(new
                {
                    message = $"Timesheet {status} successfully"
                });
            });

            group.MapGet("/entries", async (IDailyTimesheetService service) =>
            {
                var entries = await service.GetAll();
                return Results.Ok(entries);
            });

            group.MapGet("/history", async (IDailyTimesheetService service) =>
            {
                var history = await service.GetHistory();
                return Results.Ok(history);
            });

            group.MapGet("/history/{entraId}", async (
                string entraId,
                IDailyTimesheetService service) =>
            {
                var history = await service.GetHistoryByEntraId(entraId);
                return Results.Ok(history);
            });

            group.MapGet("/entries/{entraId}", async (
                string entraId,
                IDailyTimesheetService service) =>
            {
                var entries = await service.GetAllByEntraId(entraId);
                return Results.Ok(entries);
            });

            group.MapGet("/weekly-hours/{entraId}", async (
                string entraId,
                IDailyTimesheetService service) =>
            {
                var hours = await service.GetCurrentWeekHours(entraId);
                return Results.Ok(new { totalHours = hours });
            });

            group.MapGet("/admin-remarks-count/{entraId}", async (
                string entraId,
                IDailyTimesheetService service) =>
            {
                var count = await service.GetAdminRemarksCount(entraId);
                return Results.Ok(new { totalRemarks = count });
            });

            group.MapGet("/monthly-hours/{entraId}", async (
                string entraId,
                IDailyTimesheetService service) =>
            {
                var data = await service.GetMonthlyHours(entraId);
                return Results.Ok(data);
            });
        }
    }
}