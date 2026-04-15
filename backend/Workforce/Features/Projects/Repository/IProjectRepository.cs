using Workforce.Features.Projects.Entities;

namespace Workforce.Features.Projects.Repository;

public interface IProjectRepository
{// For project basic info (Id, Name, PlannedHours)
    Task<List<ProjectBasicInfo>> GetProjectBasicInfoAsync(List<Guid>? projectIds = null);

    // For headcount per project
    Task<Dictionary<Guid, int>> GetHeadcountByProjectIdsAsync(List<Guid> projectIds);

    // For fetching projects by IDs (with Name, PlannedHours)
    Task<Dictionary<Guid, Project>> GetProjectsByIdsAsync(List<Guid> projectIds);
    Task<bool> DoUsersShareProjectAsync(Guid userId1, Guid userId2);
    Task<Project?> GetProjectByIdAsync(Guid id, bool includeAssignments = false);
    Task<List<Project>> GetAllProjectsAsync(string? status, string? search, bool includeAssignments = false, Guid? userId = null);
    Task<int> GetTotalProjectCountAsync();
    Task AddProjectAsync(Project project);
    Task UpdateProjectAsync(Project project);
    Task SoftDeleteProjectAsync(Guid id);
    Task<bool> ProjectExistsAsync(Guid id);
    Task<List<ProjectAssignment>> GetProjectAssignmentsAsync(Guid projectId);
    Task AddProjectAssignmentAsync(ProjectAssignment assignment);
    Task RemoveProjectAssignmentAsync(Guid projectId, Guid userId);
    Task<ProjectAssignment?> GetProjectAssignmentAsync(Guid projectId, Guid userId);
    Task<List<Guid>> GetAssignedUserIdsForProjectAsync(Guid projectId);
    Task<int> CountDistinctProjectsByUserIdAsync(Guid userId);
    // ✅ NEW: Save changes to the underlying context
    Task SaveChangesAsync();
}