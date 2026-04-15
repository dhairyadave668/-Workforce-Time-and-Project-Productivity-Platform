using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Entities;
using Workforce.Features.Projects.Repository;

namespace Workforce.Features.Projects.Services;

public class ProjectTaskService : IProjectTaskService
{
    private readonly IProjectTaskRepository _taskRepository;
    private readonly IProjectService _projectService;

    public ProjectTaskService(IProjectTaskRepository taskRepository, IProjectService projectService)
    {
        _taskRepository = taskRepository;
        _projectService = projectService;
    }

    private DateTime GetCurrentIndiaTime()
    {
        var indiaZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, indiaZone);
    }

    public async Task<List<TaskResponseDto>> GetAllTasks()
    {
        return await _taskRepository.GetAllTasksAsync();
    }

    public async Task<ProjectTask?> GetTask(Guid id)
    {
        return await _taskRepository.GetTaskByIdAsync(id);
    }

    public async Task<ProjectTask> CreateTask(CreateTaskDto dto, Guid userId)
    {
        var indiaTime = GetCurrentIndiaTime();

        var task = new ProjectTask
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Priority = dto.Priority,
            Status = dto.Status,
            ProjectId = dto.ProjectId,
            Task_Hours = dto.Task_Hours,
            CategoryId = dto.CategoryId,
            AssignedTo = dto.AssignedTo,
            Created_By = userId,
            Updated_By = userId,
            Created_On = indiaTime,
            Updated_On = indiaTime
        };

        return await _taskRepository.CreateTaskAsync(task);
    }

    public async Task<bool> UpdateTask(Guid id, UpdateTaskDto dto, Guid userId)
    {
        var task = await _taskRepository.GetTaskByIdAsync(id);
        if (task == null) return false;

        task.Name = dto.Name;
        task.Priority = dto.Priority;
        task.Status = dto.Status;
        task.Task_Hours = dto.Task_Hours;
        task.CategoryId = dto.CategoryId;
        task.AssignedTo = dto.AssignedTo;
        task.Updated_By = userId;
        task.Updated_On = GetCurrentIndiaTime();

        return await _taskRepository.UpdateTaskAsync(task);
    }

    public async Task<bool> DeleteTask(Guid id)
    {
        return await _taskRepository.DeleteTaskAsync(id);
    }

    public async Task<bool> UpdateTaskStatus(Guid id, string status, Guid userId)
    {
        var indiaTime = GetCurrentIndiaTime();
        var success = await _taskRepository.UpdateTaskStatusAsync(id, status, userId, indiaTime);
        if (success)
        {
            var task = await _taskRepository.GetTaskByIdAsync(id);
            if (task?.ProjectId != null)
                await _projectService.UpdateProjectLoggedHoursAsync(task.ProjectId.Value);
        }
        return success;
    }

    public async Task<List<TaskResponseDto>> GetAllActiveTasks(bool excludePending = false)
    {
        return await _taskRepository.GetAllActiveTasksAsync(excludePending);
    }
}