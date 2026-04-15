using Microsoft.EntityFrameworkCore;
using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Entities;

using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.Projects.Repository;

public class ProjectTaskRepository : IProjectTaskRepository
{
    private readonly AppDbContext _context;

    public ProjectTaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProjectTask?> GetTaskByIdAsync(Guid id)
    {
        return await _context.ProjectTasks
            .FirstOrDefaultAsync(t => t.Id == id && !t.Is_Deleted);
    }

    public async Task<ProjectTask> CreateTaskAsync(ProjectTask task)
    {
        _context.ProjectTasks.Add(task);
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<bool> UpdateTaskAsync(ProjectTask task)
    {
        _context.ProjectTasks.Update(task);
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> DeleteTaskAsync(Guid id)
    {
        var task = await _context.ProjectTasks.FindAsync(id);
        if (task == null) return false;
        task.Is_Deleted = true;
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> UpdateTaskStatusAsync(Guid id, string status, Guid userId, DateTime updatedOn)
    {
        var task = await _context.ProjectTasks.FindAsync(id);
        if (task == null) return false;
        task.Status = status;
        task.Updated_By = userId;
        task.Updated_On = updatedOn;
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<List<TaskResponseDto>> GetAllTasksAsync()
    {
        return await (
            from task in _context.ProjectTasks
            where !task.Is_Deleted
            join project in _context.Projects
                on task.ProjectId equals project.Id into proj
            from project in proj.DefaultIfEmpty()
            select new TaskResponseDto
            {
                Id = task.Id,
                Name = task.Name,
                Priority = task.Priority,
                Status = task.Status,
                ProjectId = task.ProjectId,
                ProjectName = project != null ? project.Name : "Other",
                Task_Hours = task.Task_Hours,
                Created_On = task.Created_On,
                Updated_On = task.Updated_On,
                Created_By = task.Created_By,
                Updated_By = task.Updated_By
            }
        ).ToListAsync();
    }

    public async Task<List<TaskResponseDto>> GetAllActiveTasksAsync(bool excludePending)
    {
        var query = _context.ProjectTasks.Where(t => !t.Is_Deleted);
        if (excludePending)
            query = query.Where(t => t.Status != "Pending");

        return await (
            from task in query
            join project in _context.Projects
                on task.ProjectId equals project.Id into proj
            from project in proj.DefaultIfEmpty()
            select new TaskResponseDto
            {
                Id = task.Id,
                Name = task.Name,
                Priority = task.Priority,
                Status = task.Status,
                ProjectId = task.ProjectId,
                ProjectName = project != null ? project.Name : "Other",
                Task_Hours = task.Task_Hours,
                Created_On = task.Created_On,
                Updated_On = task.Updated_On,
                Created_By = task.Created_By,
                Updated_By = task.Updated_By
            }
        ).ToListAsync();
    }
    // ✅ NEW: Get tasks for multiple projects, optionally filtered by statuses
    public async Task<List<ProjectTask>> GetTasksByProjectIdsAsync(List<Guid> projectIds, string[]? statuses = null)
    {
        var query = _context.ProjectTasks
            .Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value) && !t.Is_Deleted);

        if (statuses != null && statuses.Any())
            query = query.Where(t => statuses.Contains(t.Status));

        return await query.ToListAsync();
    }
    public async Task<List<Guid>> GetNonPendingTaskIdsByProjectIdsAsync(List<Guid> projectIds)
    {
        return await _context.ProjectTasks
            .Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)
                        && !t.Is_Deleted && t.Status != TaskStatusConstants.Pending)
            .Select(t => t.Id)
            .ToListAsync();
    }
}