using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Workforce.Features.Identity.Repository;
using Workforce.Features.Projects.DTOs;
using Workforce.Features.Projects.Entities;
using Workforce.Features.Projects.Repository;
using Workforce.Features.Timesheets.Repository;
using Workforce.Features.Timesheets.Entities;

namespace Workforce.Features.Projects.Services;

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepo;
    private readonly IUserRepository _userRepo;
    private readonly IProjectTaskRepository _taskRepo;
    private readonly ITimesheetRepository _timesheetRepo;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ProjectService(
        IProjectRepository projectRepo,
        IUserRepository userRepo,
        IProjectTaskRepository taskRepo,
        ITimesheetRepository timesheetRepo,
        IHttpContextAccessor httpContextAccessor)
    {
        _projectRepo = projectRepo;
        _userRepo = userRepo;
        _taskRepo = taskRepo;
        _timesheetRepo = timesheetRepo;
        _httpContextAccessor = httpContextAccessor;
    }

    private DateTime GetCurrentIndiaTime()
    {
        var indiaZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, indiaZone);
    }

    // ========== HELPER: Calculate logged hours for a single project ==========
    private async Task<decimal> CalculateLoggedHoursForProjectAsync(Guid projectId)
    {
        var timesheetEntries = await _timesheetRepo.GetTimesheetEntriesByProjectIdsAsync(new List<Guid> { projectId });
        var tasks = await _taskRepo.GetTasksByProjectIdsAsync(
            new List<Guid> { projectId },
            new[] { TaskStatusConstants.InProgress, TaskStatusConstants.Completed });

        var taskIds = tasks.Select(t => t.Id).ToHashSet();

        return timesheetEntries
            .Where(e => e.TaskId.HasValue && taskIds.Contains(e.TaskId.Value))
            .Sum(e => e.Hours);
    }

    // ========== HELPER: Batch calculate for many projects ==========
    private async Task<Dictionary<Guid, decimal>> CalculateLoggedHoursForProjectsAsync(List<Guid> projectIds)
    {
        if (projectIds == null || !projectIds.Any())
            return new Dictionary<Guid, decimal>();

        var timesheetEntries = await _timesheetRepo.GetTimesheetEntriesByProjectIdsAsync(projectIds);
        var tasks = await _taskRepo.GetTasksByProjectIdsAsync(
            projectIds,
            new[] { TaskStatusConstants.InProgress, TaskStatusConstants.Completed });

        var allowedTaskIdsByProject = tasks
            .Where(t => t.ProjectId.HasValue)
            .GroupBy(t => t.ProjectId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(t => t.Id).ToHashSet());

        var result = new Dictionary<Guid, decimal>();
        foreach (var projectId in projectIds)
        {
            var allowedTaskIds = allowedTaskIdsByProject.GetValueOrDefault(projectId) ?? new HashSet<Guid>();
            var total = timesheetEntries
                .Where(e => e.ProjectId == projectId && e.TaskId.HasValue && allowedTaskIds.Contains(e.TaskId.Value))
                .Sum(e => e.Hours);
            result[projectId] = total;
        }
        return result;
    }

    // ========== UPDATE STORED LOGGED HOURS COLUMN ==========
    public async Task UpdateProjectLoggedHoursAsync(Guid projectId)
    {
        Console.WriteLine($"[DEBUG] Updating project {projectId}");
        var loggedHours = await CalculateLoggedHoursForProjectAsync(projectId);
        Console.WriteLine($"[DEBUG] Calculated hours: {loggedHours}");
        var project = await _projectRepo.GetProjectByIdAsync(projectId);
        if (project != null)
        {
            project.LoggedHrs = loggedHours;
            await _projectRepo.SaveChangesAsync();  // ✅ using repository save
            Console.WriteLine($"[DEBUG] Saved. New LoggedHrs: {project.LoggedHrs}");
        }
    }

    // ========== EXISTING METHODS (updated to use IST and repository save) ==========

    public async Task<object> GetProjectByIdAsync(Guid id)
    {
        var project = await _projectRepo.GetProjectByIdAsync(id, true);
        return project == null ? null! : MapToResponse(project);
    }

    public async Task<IEnumerable<object>> GetAllProjectsAsync(string? status, string? search)
    {
        var projects = await _projectRepo.GetAllProjectsAsync(status, search, true);
        return projects.Select(MapToResponse);
    }

    public async Task<object> CreateProjectAsync(CreateProjectRequest request)
    {
        if (!Enum.TryParse<ProjectStatus>(request.Status, true, out var status))
            throw new ArgumentException("Invalid status");

        var currentUserId = await GetCurrentUserIdAsync();
        if (currentUserId == null)
            throw new UnauthorizedAccessException("User not authenticated");

        var indiaTime = GetCurrentIndiaTime();

        var project = new Project
        {
            Name = request.Name,
            Client = request.Client,
            Status = status.ToString(),
            StartDate = request.StartDate?.ToDateTime(TimeOnly.MinValue),
            EndDate = request.EndDate?.ToDateTime(TimeOnly.MinValue),
            PlannedHours = request.PlannedHours,
            Description = request.Description,
            Color = request.Color ?? "#4F46E5",
            CreatedBy = currentUserId,
            CreatedOn = indiaTime,
            LoggedHrs = 0
        };

        if (request.MemberAllocations != null)
        {
            foreach (var alloc in request.MemberAllocations)
            {
                project.Assignments.Add(new ProjectAssignment
                {
                    ProjectId = project.Id,
                    UserId = alloc.UserId,
                    EmployeeAllocatedHours = alloc.Hours,
                    AssignedAt = indiaTime
                });
            }
        }

        await _projectRepo.AddProjectAsync(project);
        await _projectRepo.SaveChangesAsync();

        var created = await _projectRepo.GetProjectByIdAsync(project.Id, true);
        return MapToResponse(created!);
    }
    public async Task<bool> DoUsersShareProjectAsync(Guid userId1, Guid userId2)
    {
        if (userId1 == userId2) return true;
        return await _projectRepo.DoUsersShareProjectAsync(userId1, userId2);
    }
    public async Task<object> UpdateProjectAsync(Guid id, UpdateProjectRequest request)
    {
        var project = await _projectRepo.GetProjectByIdAsync(id, true);
        if (project == null) return null!;

        var currentUserId = await GetCurrentUserIdAsync();
        if (currentUserId == null)
            throw new UnauthorizedAccessException("User not authenticated");

        if (!string.IsNullOrWhiteSpace(request.Name)) project.Name = request.Name;
        if (!string.IsNullOrWhiteSpace(request.Client)) project.Client = request.Client;
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<ProjectStatus>(request.Status, true, out var status))
            project.Status = status.ToString();
        if (request.StartDate.HasValue) project.StartDate = request.StartDate.Value.ToDateTime(TimeOnly.MinValue);
        if (request.EndDate.HasValue) project.EndDate = request.EndDate.Value.ToDateTime(TimeOnly.MinValue);
        if (request.PlannedHours.HasValue) project.PlannedHours = request.PlannedHours.Value;
        if (request.Description != null) project.Description = request.Description;
        if (request.Color != null) project.Color = request.Color;

        project.UpdatedBy = currentUserId;
        project.UpdatedOn = GetCurrentIndiaTime();

        if (request.MemberAllocations != null)
        {
            project.Assignments.Clear();
            var indiaTime = GetCurrentIndiaTime();
            foreach (var alloc in request.MemberAllocations)
            {
                project.Assignments.Add(new ProjectAssignment
                {
                    ProjectId = project.Id,
                    UserId = alloc.UserId,
                    EmployeeAllocatedHours = alloc.Hours,
                    AssignedAt = indiaTime
                });
            }
        }

        await _projectRepo.UpdateProjectAsync(project);
        await _projectRepo.SaveChangesAsync();

        var updated = await _projectRepo.GetProjectByIdAsync(id, true);
        return MapToResponse(updated!);
    }

    public async Task<bool> DeleteProjectAsync(Guid id)
    {
        if (!await _projectRepo.ProjectExistsAsync(id)) return false;
        await _projectRepo.SoftDeleteProjectAsync(id);
        await _projectRepo.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetTotalProjectCountAsync() =>
        await _projectRepo.GetTotalProjectCountAsync();

    public async Task<int> GetUserProjectCountAsync(string entraId)
    {
        var user = await _userRepo.GetUserByEntraIdAsync(entraId);
        if (user == null) throw new KeyNotFoundException("User not found");
        return await _projectRepo.CountDistinctProjectsByUserIdAsync(user.Id);
    }

    public async Task<IEnumerable<object>> GetAllProjectsAsync(string? status, string? search, Guid? userId = null)
    {
        var projects = await _projectRepo.GetAllProjectsAsync(status, search, true, userId);
        return projects.Select(MapToResponse);
    }

    public async Task<IEnumerable<object>> GetProjectsWithLoggedHoursAsync(string? status, string? search)
    {
        var projects = await _projectRepo.GetAllProjectsAsync(status, search, true);
        var projectIds = projects.Select(p => p.Id).ToList();
        var hoursByProject = await CalculateLoggedHoursForProjectsAsync(projectIds);
        return projects.Select(p => MapToResponseWithLoggedHours(p, hoursByProject));
    }

    public async Task<IEnumerable<Guid>> AssignMembersToProjectAsync(Guid projectId, AssignMembersRequest request)
    {
        if (!await _projectRepo.ProjectExistsAsync(projectId))
            throw new KeyNotFoundException("Project not found");

        var existing = await _projectRepo.GetAssignedUserIdsForProjectAsync(projectId);
        var newUserIds = request.UserIds.Except(existing).ToList();

        var indiaTime = GetCurrentIndiaTime();
        foreach (var userId in newUserIds)
        {
            await _projectRepo.AddProjectAssignmentAsync(new ProjectAssignment
            {
                ProjectId = projectId,
                UserId = userId,
                AssignedAt = indiaTime
            });
        }
        await _projectRepo.SaveChangesAsync();
        return newUserIds;
    }

    public async Task<bool> RemoveMemberFromProjectAsync(Guid projectId, Guid userId)
    {
        var assignment = await _projectRepo.GetProjectAssignmentAsync(projectId, userId);
        if (assignment == null) return false;
        await _projectRepo.RemoveProjectAssignmentAsync(projectId, userId);
        await _projectRepo.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<object>> GetProjectMembersAsync(Guid projectId)
    {
        var assignments = await _projectRepo.GetProjectAssignmentsAsync(projectId);
        return assignments.Select(a => new
        {
            a.UserId,
            a.User.Name,
            a.User.Email,
            a.AssignedAt
        });
    }

    // ========== PRIVATE HELPERS ==========
    private async Task<Guid?> GetCurrentUserIdAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User == null) return null;

        var entraId = httpContext.User.FindFirst("oid")?.Value
                   ?? httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(entraId)) return null;

        var user = await _userRepo.GetUserByEntraIdAsync(entraId);
        return user?.Id;
    }

    private static object MapToResponse(Project p)
    {
        return new
        {
            p.Id,
            p.Name,
            p.Client,
            Status = p.Status,
            p.Description,
            StartDate = p.StartDate != null ? DateOnly.FromDateTime(p.StartDate.Value) : (DateOnly?)null,
            EndDate = p.EndDate != null ? DateOnly.FromDateTime(p.EndDate.Value) : (DateOnly?)null,
            PlannedHours = p.PlannedHours,
            LoggedHrs = p.LoggedHrs,
            p.Color,
            MemberAllocations = p.Assignments.Select(a => new
            {
                a.UserId,
                Hours = a.EmployeeAllocatedHours,
                UserName = a.User?.Name ?? "Unknown",
                UserEmail = a.User?.Email
            }).ToList()
        };
    }

    private static object MapToResponseWithLoggedHours(Project p, Dictionary<Guid, decimal> hoursByProject)
    {
        return new
        {
            p.Id,
            p.Name,
            p.Client,
            Status = p.Status,
            p.Description,
            StartDate = p.StartDate != null ? DateOnly.FromDateTime(p.StartDate.Value) : (DateOnly?)null,
            EndDate = p.EndDate != null ? DateOnly.FromDateTime(p.EndDate.Value) : (DateOnly?)null,
            PlannedHours = p.PlannedHours,
            LoggedHrs = hoursByProject.GetValueOrDefault(p.Id, 0),
            p.Color,
            MemberAllocations = p.Assignments.Select(a => new
            {
                a.UserId,
                Hours = a.EmployeeAllocatedHours,
                UserName = a.User?.Name ?? "Unknown"
            }).ToList()
        };
    }
}