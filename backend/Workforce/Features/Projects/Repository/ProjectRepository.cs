using Microsoft.EntityFrameworkCore;
using Workforce.Features.Projects.Entities;

using Workforce.Infrastructure.Persistence;
namespace Workforce.Features.Projects.Repository;

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _context;

    public ProjectRepository(AppDbContext context) => _context = context;

    public async Task<Project?> GetProjectByIdAsync(Guid id, bool includeAssignments = false)
    {
        var query = _context.Projects.AsQueryable();
        if (includeAssignments)
            query = query.Include(p => p.Assignments).ThenInclude(a => a.User);
        return await query.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
    }

    public async Task<List<Project>> GetAllProjectsAsync(string? status, string? search, bool includeAssignments = false, Guid? userId = null)
    {
        var query = _context.Projects.Where(p => !p.IsDeleted);

        if (userId.HasValue)
        {
            query = query.Where(p => p.Assignments.Any(a => a.UserId == userId.Value));
        }

        if (includeAssignments)
            query = query.Include(p => p.Assignments).ThenInclude(a => a.User);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ProjectStatus>(status, true, out _))
            query = query.Where(p => p.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Client != null && p.Client.Contains(search)));

        return await query.AsNoTracking().ToListAsync();
    }

    public async Task<int> GetTotalProjectCountAsync() =>
        await _context.Projects.CountAsync(p => !p.IsDeleted);

    public async Task AddProjectAsync(Project project) =>
        await _context.Projects.AddAsync(project);

    public async Task UpdateProjectAsync(Project project) =>
        await Task.CompletedTask; // tracked by context, no explicit action

    public async Task SoftDeleteProjectAsync(Guid id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project != null) project.IsDeleted = true;
    }

    public async Task<bool> ProjectExistsAsync(Guid id) =>
        await _context.Projects.AnyAsync(p => p.Id == id && !p.IsDeleted);

    public async Task<List<ProjectAssignment>> GetProjectAssignmentsAsync(Guid projectId) =>
        await _context.ProjectAssignments
            .Where(a => a.ProjectId == projectId)
            .Include(a => a.User)
            .ToListAsync();

    public async Task AddProjectAssignmentAsync(ProjectAssignment assignment) =>
        await _context.ProjectAssignments.AddAsync(assignment);

    public async Task RemoveProjectAssignmentAsync(Guid projectId, Guid userId)
    {
        var assignment = await _context.ProjectAssignments
            .FirstOrDefaultAsync(a => a.ProjectId == projectId && a.UserId == userId);
        if (assignment != null) _context.ProjectAssignments.Remove(assignment);
    }

    public async Task<ProjectAssignment?> GetProjectAssignmentAsync(Guid projectId, Guid userId) =>
        await _context.ProjectAssignments
            .FirstOrDefaultAsync(a => a.ProjectId == projectId && a.UserId == userId);

    public async Task<List<Guid>> GetAssignedUserIdsForProjectAsync(Guid projectId) =>
        await _context.ProjectAssignments
            .Where(a => a.ProjectId == projectId)
            .Select(a => a.UserId)
            .ToListAsync();

    public async Task<int> CountDistinctProjectsByUserIdAsync(Guid userId) =>
    await _context.ProjectAssignments
        .Where(pa => pa.UserId == userId && !pa.Project.IsDeleted)
        .Select(pa => pa.ProjectId)
        .Distinct()
        .CountAsync();
    public async Task<bool> DoUsersShareProjectAsync(Guid userId1, Guid userId2)
    {
        // Get all project IDs where userId1 is assigned
        var projectsOfUser1 = await _context.ProjectAssignments
            .Where(pa => pa.UserId == userId1)
            .Select(pa => pa.ProjectId)
            .Distinct()
            .ToListAsync();

        if (!projectsOfUser1.Any()) return false;

        // Check if userId2 is assigned to any of those projects
        return await _context.ProjectAssignments
            .AnyAsync(pa => pa.UserId == userId2 && projectsOfUser1.Contains(pa.ProjectId));
    }
    public async Task<List<ProjectBasicInfo>> GetProjectBasicInfoAsync(List<Guid>? projectIds = null)
    {
        var query = _context.Projects.Where(p => !p.IsDeleted);
        if (projectIds != null && projectIds.Any())
            query = query.Where(p => projectIds.Contains(p.Id));
        return await query.Select(p => new ProjectBasicInfo
        {
            Id = p.Id,
            Name = p.Name,
            PlannedHours = p.PlannedHours
        }).ToListAsync();
    }

    public async Task<Dictionary<Guid, int>> GetHeadcountByProjectIdsAsync(List<Guid> projectIds)
    {
        return await _context.ProjectAssignments
            .Where(a => projectIds.Contains(a.ProjectId) && !a.User.IsDeleted)
            .GroupBy(a => a.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.ProjectId, g => g.Count);
    }

    public async Task<Dictionary<Guid, Project>> GetProjectsByIdsAsync(List<Guid> projectIds)
    {
        return await _context.Projects
            .Where(p => projectIds.Contains(p.Id) && !p.IsDeleted)
            .ToDictionaryAsync(p => p.Id);
    }
    // ✅ NEW: Save changes
    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
}
public class ProjectBasicInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal PlannedHours { get; set; }
}