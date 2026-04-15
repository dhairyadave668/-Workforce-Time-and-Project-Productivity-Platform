using Workforce.Features.Projects.DTOs;

namespace Workforce.Features.Projects.Services;

public interface IProjectService
{
    Task<bool> DoUsersShareProjectAsync(Guid userId1, Guid userId2);
    Task<object> GetProjectByIdAsync(Guid id);
    Task<IEnumerable<object>> GetAllProjectsAsync(string? status, string? search, Guid? userId = null);
    Task<object> CreateProjectAsync(CreateProjectRequest request);
    Task<object> UpdateProjectAsync(Guid id, UpdateProjectRequest request);
    Task<bool> DeleteProjectAsync(Guid id);
    Task<int> GetTotalProjectCountAsync();
    Task<int> GetUserProjectCountAsync(string entraId);
    Task<IEnumerable<object>> GetProjectsWithLoggedHoursAsync(string? status, string? search);
    Task<IEnumerable<Guid>> AssignMembersToProjectAsync(Guid projectId, AssignMembersRequest request);
    Task<bool> RemoveMemberFromProjectAsync(Guid projectId, Guid userId);
    Task<IEnumerable<object>> GetProjectMembersAsync(Guid projectId);
    Task UpdateProjectLoggedHoursAsync(Guid projectId);   // new
}