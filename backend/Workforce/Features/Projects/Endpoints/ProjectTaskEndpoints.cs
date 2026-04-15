using System.Text.Json;
using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Services;
using Workforce.Features.Identity.Repository;
using Workforce.Features.AuditLog.Services;
using Workforce.Features.AuditLog.DTOs;
using Workforce.Infrastructure.Persistence;
 
namespace Workforce.Features.Projects.Endpoints;

public static class ProjectTaskEndpoints
{
    public static void MapProjectTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tasks")
                        .WithTags("Project Tasks");

        // GET ALL TASKS
        group.MapGet("/all", async (IProjectTaskService service) =>
        {
            return Results.Ok(await service.GetAllTasks());
        });

        // GET ACTIVE TASKS
        group.MapGet("/", async (IProjectTaskService service, bool excludePending = false) =>
        {
            var tasks = await service.GetAllActiveTasks(excludePending);
            return Results.Ok(tasks);
        });

        // GET TASK BY ID
        group.MapGet("/{id}", async (Guid id, IProjectTaskService service) =>
        {
            var task = await service.GetTask(id);
            return task is null ? Results.NotFound() : Results.Ok(task);
        });

        // CREATE TASK
        group.MapPost("", async (
            CreateTaskDto dto,
            IProjectTaskService service,
            IUserRepository userRepo,
            AuditLogService auditLogService,
            HttpContext http) =>
        {
            http.Items["SkipAudit"] = true;

            if (string.IsNullOrEmpty(dto.EntraId))
                return Results.BadRequest("EntraId is required");

            var user = await userRepo.GetUserByEntraIdAsync(dto.EntraId);
            if (user is null)
                return Results.Unauthorized();

            var task = await service.CreateTask(dto, user.Id);

            await auditLogService.CreateLog(dto.EntraId, new CreateAuditLogDto
            {
                Action = "TASK CREATED",
                Target = "/api/tasks",
                Metadata = JsonSerializer.Serialize(new
                {
                    Action = "TASK CREATED",
                    CreatedBy = new { Name = user.Name }
                }),
                RoleId = user.RoleId
            });

            return Results.Ok(task);
        });

        // UPDATE TASK
        group.MapPut("/{id}", async (
            Guid id,
            UpdateTaskDto dto,
            IProjectTaskService service,
            IUserRepository userRepo,
            AuditLogService auditLogService,
            HttpContext http) =>
        {
            http.Items["SkipAudit"] = true;

            if (string.IsNullOrEmpty(dto.EntraId))
                return Results.BadRequest("EntraId is required");

            var user = await userRepo.GetUserByEntraIdAsync(dto.EntraId);
            if (user is null)
                return Results.Unauthorized();

            var result = await service.UpdateTask(id, dto, user.Id);
            if (!result)
                return Results.NotFound();

            await auditLogService.CreateLog(dto.EntraId, new CreateAuditLogDto
            {
                Action = "TASK UPDATED",
                Target = $"/api/tasks/{id}",
                Metadata = JsonSerializer.Serialize(new
                {
                    Action = "TASK UPDATED",
                    UpdatedBy = new { Name = user.Name }
                }),
                RoleId = user.RoleId
            });

            return Results.Ok();
        });

        // DELETE TASK
        group.MapDelete("/{id}", async (
            Guid id,
            HttpContext http,
            IProjectTaskService service,
            IUserRepository userRepo,
            AuditLogService auditLogService) =>
        {
            http.Items["SkipAudit"] = true;

            var entraId = http.Request.Headers["entraid"].FirstOrDefault();
            if (string.IsNullOrEmpty(entraId))
                return Results.Unauthorized();

            var user = await userRepo.GetUserByEntraIdAsync(entraId);
            if (user is null)
                return Results.Unauthorized();

            var result = await service.DeleteTask(id);
            if (!result)
                return Results.NotFound();

            await auditLogService.CreateLog(entraId, new CreateAuditLogDto
            {
                Action = "TASK DELETED",
                Target = $"/api/tasks/{id}",
                Metadata = JsonSerializer.Serialize(new
                {
                    Action = "TASK DELETED",
                    DeletedBy = new { Name = user.Name }
                }),
                RoleId = user.RoleId
            });

            return Results.Ok();
        });

        // UPDATE TASK STATUS
        group.MapPut("/{id}/status", async (
            Guid id,
            UpdateTaskStatusDto dto,
            IProjectTaskService service,
            IUserRepository userRepo,
            AuditLogService auditLogService,
            HttpContext http) =>
        {
            http.Items["SkipAudit"] = true;

            if (string.IsNullOrEmpty(dto.EntraId))
                return Results.BadRequest("EntraId is required");

            var user = await userRepo.GetUserByEntraIdAsync(dto.EntraId);
            if (user is null)
                return Results.Unauthorized();

            var result = await service.UpdateTaskStatus(id, dto.Status, user.Id);
            if (!result)
                return Results.NotFound();

            await auditLogService.CreateLog(dto.EntraId, new CreateAuditLogDto
            {
                Action = "TASK STATUS UPDATED",
                Target = $"/api/tasks/{id}/status",
                Metadata = JsonSerializer.Serialize(new
                {
                    Action = "TASK STATUS UPDATED",
                    Status = dto.Status,
                    UpdatedBy = new { Name = user.Name }
                }),
                RoleId = user.RoleId
            });

            return Results.Ok();
        });
    }
}