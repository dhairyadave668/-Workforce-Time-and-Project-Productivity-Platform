using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Entities;

namespace Workforce.Features.Projects.Services;

public interface IProjectTaskService
{
    Task<List<TaskResponseDto>> GetAllTasks();
    Task<ProjectTask?> GetTask(Guid id);
    Task<ProjectTask> CreateTask(CreateTaskDto dto, Guid userId);
    Task<bool> UpdateTask(Guid id, UpdateTaskDto dto, Guid userId);
    Task<bool> DeleteTask(Guid id);
    Task<bool> UpdateTaskStatus(Guid id, string status, Guid userId);
    
    Task<List<TaskResponseDto>> GetAllActiveTasks(bool excludePending = false);
}