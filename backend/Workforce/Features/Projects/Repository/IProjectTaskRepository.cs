using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Entities;

namespace Workforce.Features.Projects.Repository;

public interface IProjectTaskRepository
{
    Task<List<Guid>> GetNonPendingTaskIdsByProjectIdsAsync(List<Guid> projectIds);
    // Basic CRUD (entity-based)
    Task<ProjectTask?> GetTaskByIdAsync(Guid id);
    Task<ProjectTask> CreateTaskAsync(ProjectTask task);
    Task<bool> UpdateTaskAsync(ProjectTask task);
    Task<bool> DeleteTaskAsync(Guid id);
    Task<bool> UpdateTaskStatusAsync(Guid id, string status, Guid userId, DateTime updatedOn);

    // Complex queries returning DTOs (joins)
    Task<List<TaskResponseDto>> GetAllTasksAsync();
    Task<List<TaskResponseDto>> GetAllActiveTasksAsync(bool excludePending);
    // ✅ NEW: For logged hours calculation
    Task<List<ProjectTask>> GetTasksByProjectIdsAsync(List<Guid> projectIds, string[]? statuses = null);
}